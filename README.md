# indibi.js - Ein einfacher IndexedDB Wrapper

`indibi.js` ist eine kleine JavaScript-Bibliothek, die die Interaktion mit IndexedDB vereinfacht. Sie bietet eine Promise-basierte API zur Initialisierung von Datenbanken, zum Erstellen von Object Stores und zur Durchführung von CRUD-Operationen (Create, Read, Update, Delete) sowie Suchfunktionen.

## Features

*   Einfache Initialisierung von IndexedDB-Datenbanken.
*   Automatisches Erstellen von Object Stores mit einem Primärschlüssel `id` (auto-increment).
*   Promise-basierte API für asynchrone Operationen.
*   `StoreManager`-Objekte für den einfachen Zugriff auf CRUD-Methoden pro Store:
    *   `add(data)`: Fügt einen neuen Datensatz hinzu.
    *   `list()`: Listet alle Datensätze eines Stores auf.
    *   `get(id)`: Ruft einen Datensatz anhand seiner ID ab.
    *   `update(data)`: Aktualisiert einen vorhandenen Datensatz (Upsert-Verhalten).
    *   `delete(id)`: Löscht einen Datensatz anhand seiner ID.
    *   `find(filterFn)`: Sucht Datensätze basierend auf einer Filterfunktion.
*   Automatische Verwaltung von Metadaten für jeden Datensatz:
    *   `crDate`: Timestamp der Erstellung.
    *   `chDate`: Timestamp der letzten Änderung.
    *   `revisions`: Zähler für die Anzahl der Änderungen.

## Installation / Einbindung

Da `indibi.js` als ES-Modul konzipiert ist, binden Sie es einfach in Ihr HTML-Dokument ein. Stellen Sie sicher, dass der Pfad zur `indibi/index.js`-Datei korrekt ist.

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Meine App mit Indibi.js</title>
</head>
<body>
    <!-- Ihr HTML-Inhalt -->

    <script type="module" src="./assets/js/index.js"></script> 
    <!-- In index.js wird indibi.js importiert -->
</body>
</html>
```

In Ihrer Haupt-JavaScript-Datei (z.B. `assets/js/index.js`) importieren Sie `indibi`:

```javascript
// assets/js/index.js
'use strict';

import indibi from './libs/indibi/index.js'; // Pfad anpassen!

// Ihr Anwendungscode hier
```

## Verwendung

### 1. Initialisierung

Initialisieren Sie die Datenbank mit `indibi.init()`. Diese Methode gibt eine Promise zurück, die mit einem Kontextobjekt aufgelöst wird, sobald die Datenbank bereit ist.

```javascript
const initApp = () => {
    indibi.init({
        dbName: 'meineDatenbank',      // Name der Datenbank
        dbVersion: 1,                 // Version der Datenbank (erhöhen bei Schemaänderungen)
        objectstores: ['kunden', 'produkte'] // Array mit Namen der Object Stores
    })
    .then(dbContext => {
        console.log('Datenbank initialisiert:', dbContext.name, 'Version:', dbContext.version);
        // Zugriff auf StoreManager über dbContext.stores
        const kundenStore = dbContext.stores.kunden;
        const produkteStore = dbContext.stores.produkte;

        if (kundenStore) {
            // Mit dem kundenStore arbeiten
            // Beispiel: kundenStore.add({name: 'Test Kunde'}).then(...);
        }
        if (produkteStore) {
            // Mit dem produkteStore arbeiten
        }
    })
    .catch(error => {
        console.error('Fehler bei der Datenbank-Initialisierung:', error);
    });
};

initApp();
```

Das `dbContext`-Objekt enthält:
*   `name`: Der tatsächliche Name der geöffneten Datenbank.
*   `version`: Die tatsächliche Version der geöffneten Datenbank.
*   `stores`: Ein Objekt, das für jeden erfolgreich initialisierten Object Store einen `StoreManager` enthält (z.B. `dbContext.stores.kunden`).

### 2. StoreManager API

Jeder `StoreManager` bietet die folgenden Methoden (alle geben Promises zurück):

#### `add(data)`

Fügt einen neuen Datensatz hinzu. `crDate`, `chDate` und `revisions` werden automatisch gesetzt.

```javascript
// Annahme: kundenStore ist ein initialisierter StoreManager
const neuenKundenHinzufuegen = async () => {
    try {
        const neuerKunde = { name: 'Max Mustermann', email: 'max@example.com' };
        const kundeId = await kundenStore.add(neuerKunde);
        console.log('Neuer Kunde hinzugefügt mit ID:', kundeId);
        // Der Datensatz in der DB enthält nun auch id, crDate, chDate, revisions
    } catch (error) {
        console.error('Fehler beim Hinzufügen:', error);
    }
}
```

#### `list()`

Listet alle Datensätze im Store auf.

```javascript
const alleKundenAnzeigen = async () => {
    try {
        const alleKunden = await kundenStore.list();
        console.log('Alle Kunden:', alleKunden);
    } catch (error) {
        console.error('Fehler beim Auflisten:', error);
    }
}
```

#### `get(id)`

Ruft einen einzelnen Datensatz anhand seiner ID ab.

```javascript
const kundeAbrufen = async (id) => {
    try {
        const kunde = await kundenStore.get(id);
        if (kunde) {
            console.log('Kunde gefunden:', kunde);
        } else {
            console.log('Kunde nicht gefunden.');
        }
    } catch (error) {
        console.error('Fehler beim Abrufen:', error);
    }
}
```

#### `update(data)`

Aktualisiert einen vorhandenen Datensatz. Das `data`-Objekt **muss** die `id` des zu aktualisierenden Datensatzes enthalten. `chDate` und `revisions` werden automatisch aktualisiert. Die Methode gibt das vollständige, aktualisierte Objekt zurück.

```javascript
const kundeAktualisieren = async (id) => {
    try {
        let kunde = await kundenStore.get(id);
        if (!kunde) return console.log('Kunde zum Aktualisieren nicht gefunden.');

        kunde.email = 'maximilian.mustermann@example.com'; // Änderungen vornehmen
        // crDate und revisions werden automatisch behandelt

        const aktualisierterKunde = await kundenStore.update(kunde);
        console.log('Kunde aktualisiert:', aktualisierterKunde);
    } catch (error) {
        console.error('Fehler beim Aktualisieren:', error);
    }
}
```

#### `delete(id)`

Löscht einen Datensatz anhand seiner ID.

```javascript
const kundeLoeschen = async (id) => {
    try {
        await kundenStore.delete(id);
        console.log('Kunde mit ID', id, 'gelöscht.');
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
    }
}
```

#### `find(filterFn)`

Sucht Datensätze, die einer Filterfunktion entsprechen. Die Filterfunktion erhält jeden Datensatz und muss `true` zurückgeben, wenn der Datensatz in die Ergebnisse aufgenommen werden soll.

```javascript
const aktiveKundenFinden = async () => {
    try {
        const aktiveKunden = await kundenStore.find(kunde => kunde.status === 'aktiv');
        console.log('Aktive Kunden:', aktiveKunden);
    } catch (error) {
        console.error('Fehler beim Suchen:', error);
    }
}
```

### 3. Automatische Felder

Bei jeder `add`- oder `update`-Operation werden folgende Felder automatisch verwaltet:

*   `id`: (Primärschlüssel, automatisch inkrementiert bei `add`)
*   `crDate`: Timestamp (Millisekunden seit Epoche) der Erstellung des Datensatzes.
*   `chDate`: Timestamp der letzten Änderung des Datensatzes.
*   `revisions`: Ein Zähler, der bei jeder Änderung (`update`) des Datensatzes erhöht wird (beginnt bei 0 für neue Datensätze).

## Vollständiges Beispiel

```javascript
// assets/js/index.js
'use strict';

import indibi from './libs/indibi/index.js';

const app = async () => {
    try {
        const ctx = await indibi.init({
            dbName: 'MeineTestDB',
            dbVersion: 1,
            objectstores: ['notizen']
        });

        const notizenStore = ctx.stores.notizen;

        if (!notizenStore) {
            console.error('Notizen-Store konnte nicht initialisiert werden.');
            return;
        }

        // Notiz hinzufügen
        const notizId = await notizenStore.add({ titel: 'Einkaufsliste', inhalt: 'Milch, Brot' });
        console.log('Notiz hinzugefügt, ID:', notizId);

        // Notiz abrufen
        let meineNotiz = await notizenStore.get(notizId);
        console.log('Abgerufene Notiz:', meineNotiz);

        // Notiz aktualisieren
        if (meineNotiz) {
            meineNotiz.inhalt += ', Eier';
            const aktualisierteNotiz = await notizenStore.update(meineNotiz);
            console.log('Aktualisierte Notiz:', aktualisierteNotiz);
        }

        // Alle Notizen auflisten
        const alleNotizen = await notizenStore.list();
        console.log('Alle Notizen:', alleNotizen);

        // Notiz löschen
        // await notizenStore.delete(notizId);
        // console.log('Notiz mit ID', notizId, 'gelöscht.');

    } catch (error) {
        console.error('Ein Fehler ist in der App aufgetreten:', error);
    }
};

app();
```

## Fehlerbehandlung

Alle Methoden von `indibi.js` und den `StoreManager`-Instanzen geben Promises zurück. Verwenden Sie `async/await` mit `try...catch`-Blöcken oder `.then().catch()`-Ketten, um Fehler zu behandeln.
