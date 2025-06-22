"use strict";

class StoreManager {
  constructor(db, storeName, schema = {}) {
    this.db = db;
    this.storeName = storeName;
    this.schema = schema; // für die Validierung der Daten
  }

  _getTransaction(mode = "readonly") {
    if (!this.db) {
      return Promise.reject(new Error("Database connection not available."));
    }
    try {
      const transaction = this.db.transaction(this.storeName, mode);
      return transaction.objectStore(this.storeName);
    } catch (error) {
      console.error(
        `Error getting transaction for store "${this.storeName}" in mode "${mode}":`,
        error
      );
      return Promise.reject(error);
    }
  }

  // ------------------------------
  // Datenvalidierung bei add und update
  // ------------------------------
  _validateData(data, isUpdate = false) {
    if (typeof data !== "object" || data === null) {
      throw new TypeError("Daten müssen ein Objekt sein.");
    }
    if (Object.keys(this.schema).length === 0) {
      console.warn(
        `Kein Validierungsschema für Store "${this.storeName}" definiert. Daten werden nicht validiert.`
      );
      return { ...data };
    }

    const validatedData = {};
    const errors = [];

    if (isUpdate) {
      if (typeof data.id === "undefined" || data.id === null) {
        errors.push("Feld 'id' ist für Update-Operationen obligatorisch.");
      } else {
        validatedData.id = data.id;
      }
    }

    for (const key in this.schema) {
      const fieldSchema = this.schema[key];
      const value = data[key];
      const isFieldPresent = data.hasOwnProperty(key);

      if (!isFieldPresent) {
        if (!isUpdate && fieldSchema.required) {
          errors.push(`Feld "${key}" ist obligatorisch.`);
          continue;
        }
        if (isUpdate) {
          continue;
        }
      }

      if (isFieldPresent) {
        if (
          fieldSchema.required &&
          (value === null || (typeof value === "string" && value.trim() === ""))
        ) {
          errors.push(
            `Feld "${key}" ist obligatorisch und darf nicht leer sein.`
          );
        }

        if (value !== null && typeof value !== fieldSchema.type) {
          if (
            fieldSchema.type === "number" &&
            typeof value === "number" &&
            isNaN(value)
          ) {
            errors.push(`Feld "${key}" muss eine gültige Zahl sein.`);
          } else {
            errors.push(
              `Feld "${key}" muss vom Typ "${
                fieldSchema.type
              }" sein, ist aber "${typeof value}".`
            );
          }
        } else if (value === null && fieldSchema.type !== "object") {
          if (fieldSchema.required) {
            errors.push(
              `Feld "${key}" muss vom Typ "${fieldSchema.type}" sein, ist aber "null".`
            );
          }
        }

        if (
          (value !== null && typeof value === fieldSchema.type) ||
          (value === null && fieldSchema.type === "object")
        ) {
          if (fieldSchema.type === "string") {
            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
              errors.push(
                `Feld "${key}" muss mindestens ${fieldSchema.minLength} Zeichen lang sein.`
              );
            }
            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
              errors.push(
                `Feld "${key}" darf maximal ${fieldSchema.maxLength} Zeichen lang sein.`
              );
            }
            if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
              errors.push(
                `Feld "${key}" entspricht nicht dem erwarteten Format.`
              );
            }
            validatedData[key] = value.trim();
          } else if (fieldSchema.type === "number") {
            if (fieldSchema.min !== undefined && value < fieldSchema.min) {
              errors.push(
                `Feld "${key}" muss mindestens ${fieldSchema.min} sein.`
              );
            }
            if (fieldSchema.max !== undefined && value > fieldSchema.max) {
              errors.push(
                `Feld "${key}" darf maximal ${fieldSchema.max} sein.`
              );
            }
            validatedData[key] = value;
          } else {
            validatedData[key] = value;
          }

          if (
            fieldSchema.allowedValues &&
            Array.isArray(fieldSchema.allowedValues) &&
            !fieldSchema.allowedValues.includes(value)
          ) {
            errors.push(
              `Feld "${key}" hat einen ungültigen Wert. Erlaubte Werte sind: ${fieldSchema.allowedValues.join(
                ", "
              )}.`
            );
          }
        }
      }
    }

    for (const key in data) {
      if (
        !this.schema.hasOwnProperty(key) &&
        !["id", "crDate", "chDate", "revisions"].includes(key)
      ) {
        console.warn(
          `Unbekanntes Feld "${key}" im Eingabeobjekt für Store "${this.storeName}" gefunden. Es wird ignoriert.`
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Validierungsfehler für Store "${this.storeName}": ${errors.join("; ")}`
      );
    }

    return validatedData;
  }

  // ------------------------------

  add(data) {
    return new Promise((resolve, reject) => {
      try {
        const validatedData = this._validateData(data, false); // validierung für add operation

        const now = Date.now();
        const recordToAdd = {
          ...validatedData,
          crDate: now,
          chDate: now,
          revisions: 0,
        };
        const store = this._getTransaction("readwrite");
        const request = store.add(recordToAdd);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
          console.error(
            `Error adding data to store "${this.storeName}":`,
            event.target.error
          );
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
        const store = this._getTransaction("readonly");
        const request = store.getAll();
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
          console.error(
            `Error listing data from store "${this.storeName}":`,
            event.target.error
          );
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
        const store = this._getTransaction("readonly");
        const request = store.get(id);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
          console.error(
            `Error getting data with id "${id}" from store "${this.storeName}":`,
            event.target.error
          );
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
        const store = this._getTransaction("readwrite");
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
          console.error(
            `Error deleting data with id "${id}" from store "${this.storeName}":`,
            event.target.error
          );
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
      if (typeof filterFn !== "function") {
        return reject(new TypeError("The provided filter must be a function."));
      }
      try {
        const store = this._getTransaction("readonly");
        const request = store.getAll();
        request.onsuccess = (event) => {
          try {
            const allRecords = event.target.result;
            const filteredRecords = allRecords.filter(filterFn);
            resolve(filteredRecords);
          } catch (e) {
            console.error("Error applying filter function:", e);
            reject(e);
          }
        };
        request.onerror = (event) => {
          console.error(
            `Error listing data from store "${this.storeName}" for find operation:`,
            event.target.error
          );
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
      try {
        const validatedData = this._validateData(data, true); // validierung für update operation

        this.get(validatedData.id)
          .then((existingRecord) => {
            const crDate = existingRecord ? existingRecord.crDate : Date.now();
            const revisions = existingRecord
              ? typeof existingRecord.revisions === "number"
                ? existingRecord.revisions + 1
                : 1
              : 0;

            const recordToUpdate = {
              ...existingRecord,
              ...validatedData,
              crDate: crDate,
              chDate: Date.now(),
              revisions: revisions,
            };

            const store = this._getTransaction("readwrite");
            const request = store.put(recordToUpdate);
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => {
              console.error(
                `Error updating data in store "${this.storeName}":`,
                event.target.error
              );
              reject(event.target.error);
            };
          })
          .catch((error) => {
            console.error(
              `Error fetching existing record for update with id "${validatedData.id}" or validation failed:`,
              error
            );
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }
}

const indibi = {
  db: null,

  // schemas für die validierung der Daten
  // Diese Schemas definieren die Struktur und Validierungsregeln für die Daten in den
  // jeweiligen Object Stores. Immer an den aktuellen Object Store anpassen, und alles wird gut.
  schemas: {
    products: {
      name: { type: "string", required: true, minLength: 3, maxLength: 100 },
      description: { type: "string", required: false, maxLength: 500 },
      price: { type: "number", required: true, min: 0.01, max: 100000 },
      category: {
        type: "string",
        required: true,
        allowedValues: ["electronics", "books", "clothes", "home"],
      },
    },
    users: {
      username: { type: "string", required: true, minLength: 5, maxLength: 50 },
      email: {
        type: "string",
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      age: { type: "number", required: false, min: 18, max: 120 },
      role: {
        type: "string",
        required: true,
        allowedValues: ["admin", "editor", "viewer"],
      },
    },
    articles: {
      title: { type: "string", required: true, minLength: 5, maxLength: 200 },
      content: { type: "string", required: true, minLength: 50 },
      authorId: { type: "number", required: true, min: 1 },
      publishDate: { type: "number", required: true },
      tags: { type: "object", required: false },
      status: {
        type: "string",
        required: true,
        allowedValues: ["draft", "published", "archived"],
      },
    },
  },

  init({ dbName = "indibi", dbVersion = 1, objectstores = [] }) {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        console.error("This browser doesn't support IndexedDB.");
        return reject(new Error("IndexedDB not supported."));
      }

      const request = window.indexedDB.open(dbName, dbVersion);

      request.onerror = (event) => {
        console.error(
          `Database error opening "${dbName}":`,
          event.target.error
        );
        reject(event.target.error);
      };

      request.onupgradeneeded = (event) => {
        console.log(
          `Database upgrade needed for "${dbName}" to version ${dbVersion} or initial creation.`
        );
        this.db = event.target.result;
        const storeOptions = { keyPath: "id", autoIncrement: true };
        const upgradeErrors = [];

        if (objectstores && Array.isArray(objectstores)) {
          objectstores.forEach((storeName) => {
            if (typeof storeName !== "string" || storeName.trim() === "") {
              console.warn(
                `Skipping invalid object store name during upgrade: "${storeName}" (must be a non-empty string).`
              );
              upgradeErrors.push(
                `Invalid object store name skipped: "${storeName}"`
              );
              return;
            }

            if (!this.db.objectStoreNames.contains(storeName)) {
              try {
                this.db.createObjectStore(storeName, storeOptions);
                console.log(
                  `Object store "${storeName}" created successfully with keyPath 'id' and autoIncrement.`
                );
              } catch (e) {
                console.error(`Error creating object store "${storeName}":`, e);
                upgradeErrors.push(
                  `Failed to create object store "${storeName}": ${e.message}`
                );
              }
            } else {
              console.log(
                `Object store "${storeName}" already exists. Skipping creation.`
              );
            }
          });
        } else {
          console.log(
            "No object stores defined or invalid format for objectstores parameter (expected array of strings)."
          );
        }

        if (upgradeErrors.length > 0) {
          reject(
            new Error(
              `Database upgrade completed with errors: ${upgradeErrors.join(
                "; "
              )}`
            )
          );
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log(
          `Database "${dbName}" (Version: ${dbVersion}) opened successfully.`
        );

        this.db.onerror = (dbEvent) => {
          console.error(
            `Unhandled database error on "${this.db.name}":`,
            dbEvent.target.error
          );
        };

        const storeManagers = {};
        if (objectstores && Array.isArray(objectstores)) {
          objectstores.forEach((storeName) => {
            if (typeof storeName !== "string" || storeName.trim() === "") {
              console.warn(
                `Skipping invalid object store name when creating StoreManager: "${storeName}" (must be a non-empty string).`
              );
              return;
            }

            if (this.db.objectStoreNames.contains(storeName)) {
              const storeSchema = this.schemas[storeName] || {};
              storeManagers[storeName] = new StoreManager(
                this.db,
                storeName,
                storeSchema
              );
            } else {
              console.warn(
                `StoreManager not created for "${storeName}" as it was not found in the database. This might occur if onupgradeneeded didn't run or failed for this store, or if the storeName was not in the initial objectstores list during upgrade.`
              );
            }
          });
        }

        const indibiContext = {
          name: this.db.name,
          version: this.db.version,
          stores: storeManagers,
        };
        resolve(indibiContext);
      };
    });
  },
};

export default indibi;
