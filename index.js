'use strict';

class StoreManager {
    constructor(db, storeName) {
        this.db = db;
        this.storeName = storeName;
    }

    _getTransaction(mode = 'readonly') {
        if (!this.db) {
            return Promise.reject(new Error('Database connection not available.'));
        }
        try {
            const transaction = this.db.transaction(this.storeName, mode);
            return transaction.objectStore(this.storeName);
        } catch (error) {
            console.error(`Error getting transaction for store "${this.storeName}" in mode "${mode}":`, error);
            return Promise.reject(error); // This won't actually work as _getTransaction is not returning a Promise directly
                                       // but the error will be caught by the caller if it's a promise chain.
                                       // A better approach would be to wrap the transaction creation itself in a Promise if needed.
        }
    }

    add(data) {
        return new Promise((resolve, reject) => {
            try {
                const now = Date.now();
                const recordToAdd = {
                    ...data,
                    crDate: now,
                    chDate: now,
                    revisions: 0
                };
                const store = this._getTransaction('readwrite');
                const request = store.add(recordToAdd);
                request.onsuccess = (event) => resolve(event.target.result); // Returns the key of the new record
                request.onerror = (event) => {
                    console.error(`Error adding data to store "${this.storeName}":`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    list() {
        return new Promise((resolve, reject) => {
            try {
                const store = this._getTransaction('readonly');
                const request = store.getAll();
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => {
                    console.error(`Error listing data from store "${this.storeName}":`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    get(id) {
        return new Promise((resolve, reject) => {
            try {
                const store = this._getTransaction('readonly');
                const request = store.get(id);
                request.onsuccess = (event) => resolve(event.target.result); // Returns the record or undefined
                request.onerror = (event) => {
                    console.error(`Error getting data with id "${id}" from store "${this.storeName}":`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    delete(id) {
        return new Promise((resolve, reject) => {
            try {
                const store = this._getTransaction('readwrite');
                const request = store.delete(id);
                request.onsuccess = () => resolve(); // No specific result, just success
                request.onerror = (event) => {
                    console.error(`Error deleting data with id "${id}" from store "${this.storeName}":`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Finds records in the store that match a filter function.
     * Note: This method fetches all records and filters them in JavaScript.
     * For large datasets, using an index is much more performant.
     * @param {function(object): boolean} filterFn A function that returns true for items to include.
     * @returns {Promise<Array<object>>} A promise that resolves with an array of matching records.
     */
    find(filterFn) {
        return new Promise((resolve, reject) => {
            if (typeof filterFn !== 'function') {
                return reject(new TypeError('The provided filter must be a function.'));
            }
            try {
                const store = this._getTransaction('readonly');
                const request = store.getAll();
                request.onsuccess = (event) => {
                    try {
                        const allRecords = event.target.result;
                        const filteredRecords = allRecords.filter(filterFn);
                        resolve(filteredRecords);
                    } catch (e) {
                        console.error('Error applying filter function:', e);
                        reject(e);
                    }
                };
                request.onerror = (event) => {
                    console.error(`Error listing data from store "${this.storeName}" for find operation:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Updates an existing record or creates a new one if it doesn't exist (upsert).
     * The data object must contain the primary key ('id').
     * @param {object} data The data object to update/insert. It must include the 'id' property.
     * @returns {Promise<IDBValidKey>} A promise that resolves with the key of the updated/created record.
     */
    update(data) {
        return new Promise((resolve, reject) => {
            if (!data || typeof data.id === 'undefined') {
                return reject(new TypeError('Data to update must be an object and contain the primary key (id).'));
            }
            try {
                // Ensure crDate is preserved if it exists, otherwise set it (though ideally it's set on add)
                const crDate = data.crDate || Date.now(); 
                const recordToUpdate = {
                    ...data,
                    chDate: Date.now(),
                    revisions: (typeof data.revisions === 'number' ? data.revisions : -1) + 1,
                    crDate: crDate // Preserve original crDate
                };

                const store = this._getTransaction('readwrite');
                const request = store.put(recordToUpdate);
                request.onsuccess = () => resolve(recordToUpdate); // Returns the updated object
                request.onerror = (event) => {
                    console.error(`Error updating data in store "${this.storeName}":`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }
}

const indibi = {
    db: null, // To store the database connection

    init({
        dbName = 'indibi',
        dbVersion = 1,
        objectstores = [] // Array of store names
    }) {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                console.error("This browser doesn't support IndexedDB.");
                return reject(new Error("IndexedDB not supported."));
            }

            const request = window.indexedDB.open(dbName, dbVersion);

            request.onerror = (event) => {
                console.error(`Database error opening "${dbName}":`, event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                console.log(`Database upgrade needed for "${dbName}" to version ${dbVersion} or initial creation.`);
                this.db = event.target.result;
                const storeOptions = { keyPath: 'id', autoIncrement: true };

                if (objectstores && Array.isArray(objectstores)) {
                    objectstores.forEach(storeName => {
                        if (typeof storeName === 'string' && storeName.trim() !== '') {
                            if (!this.db.objectStoreNames.contains(storeName)) {
                                try {
                                    this.db.createObjectStore(storeName, storeOptions);
                                    console.log(`Object store "${storeName}" created successfully with keyPath 'id' and autoIncrement.`);
                                } catch (e) {
                                    console.error(`Error creating object store "${storeName}":`, e);
                                }
                            } else {
                                console.log(`Object store "${storeName}" already exists.`);
                            }
                        } else {
                            console.warn('Invalid object store name found (must be a non-empty string):', storeName);
                        }
                    });
                } else {
                    console.log('No object stores defined or invalid format for objectstores parameter (expected array of strings).');
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                // dbName and dbVersion here are the parameters passed to init, used for opening
                console.log(`Database "${dbName}" (Version: ${dbVersion}) opened successfully.`); 
                
                this.db.onerror = (dbEvent) => {
                    // This is a general error handler for the database connection itself
                    console.error(`Unhandled database error on "${this.db.name}":`, dbEvent.target.error);
                };

                const storeManagers = {};
                // objectstores is the array of names passed to init
                if (objectstores && Array.isArray(objectstores)) { 
                    objectstores.forEach(storeName => {
                        if (typeof storeName === 'string' && storeName.trim() !== '') {
                            // Check if the store actually exists in the database (was created in onupgradeneeded)
                            if (this.db.objectStoreNames.contains(storeName)) {
                                storeManagers[storeName] = new StoreManager(this.db, storeName);
                            } else {
                                console.warn(`StoreManager not created for "${storeName}" as it was not found in the database. This might occur if onupgradeneeded didn't run or failed for this store, or if the storeName was not in the initial objectstores list during upgrade.`);
                            }
                        }
                    });
                }

                const indibiContext = {
                    name: this.db.name, // Actual name of the opened database
                    version: this.db.version, // Actual version of the opened database
                    // requestedObjectStores: objectstores, // The list of store names originally passed to init
                    // actualObjectStoreNames: Array.from(this.db.objectStoreNames), // All store names actually in the DB
                    stores: storeManagers // Manager objects for the requested stores that were successfully found/created
                    // Future properties can be added here
                };
                resolve(indibiContext);
            };
        });
    }
};

export default indibi;
