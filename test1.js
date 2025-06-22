// prüfung der validierung der daten bei add und update
// forciert fehler.

import indibi from "./indibi.js";

async function runIndibiTests() {
  console.log("--- Starting Indibi Tests ---");

  try {
    const dbContext = await indibi.init({
      dbName: "MyTestMitFehlerausloeser",
      dbVersion: 1,
      objectstores: ["users", "products", "articles"],
    });

    console.log("Database initialized:", dbContext);

    const usersStore = dbContext.stores.users;
    const productsStore = dbContext.stores.products;
    const articlesStore = dbContext.stores.articles;

    if (!usersStore || !productsStore || !articlesStore) {
      console.error(
        "Error: Could not get all expected StoreManagers (users, products, articles). Check objectstore creation and names."
      );
      return;
    }

    console.log("\n--- Tests for Users Store ---");

    console.log("\n--- Adding valid user data ---");
    let userId1, userId2;
    try {
      userId1 = await usersStore.add({
        username: "AliceW",
        email: "alice@example.com",
        role: "editor",
        age: 30,
      });
      console.log("Added Alice, ID:", userId1);

      userId2 = await usersStore.add({
        username: "BobTheBuilder",
        email: "bob@example.com",
        role: "viewer",
        age: 45,
      });
      console.log("Added Bob, ID:", userId2);
    } catch (error) {
      console.error("Error adding valid user data:", error.message);
    }

    console.log("\n--- Attempting to add invalid user data ---");
    try {
      await usersStore.add({
        username: "Inv",
        email: "invalid-email",
      });
      console.log(
        "FEHLER: Ungültiger Benutzer wurde hinzugefügt, dies sollte nicht passieren!"
      );
    } catch (error) {
      console.warn(
        "Erfolgreich Fehler beim Hinzufügen des ungültigen Benutzers abgefangen:",
        error.message
      );
    }

    try {
      await usersStore.add({
        username: "LongUsernameThatExceedsTheMaximumLengthForAUsernameField",
        email: "test@test.com",
        role: "admin",
      });
      console.log(
        "FEHLER: Benutzer mit zu langem Namen wurde hinzugefügt, dies sollte nicht passieren!"
      );
    } catch (error) {
      console.warn(
        "Erfolgreich Fehler beim Hinzufügen des Benutzers mit zu langem Namen abgefangen:",
        error.message
      );
    }

    console.log("\n--- Listing all users ---");
    const allUsers = await usersStore.list();
    console.log("All users:", allUsers);

    console.log("\n--- Getting user by ID ---");
    if (userId1) {
      const aliceRetrieved = await usersStore.get(userId1);
      console.log("Retrieved Alice:", aliceRetrieved);
    } else {
      console.log("Alice ID nicht verfügbar, überspringe Abruf.");
    }

    console.log("\n--- Updating a user ---");
    if (userId1) {
      try {
        await usersStore.update({
          id: userId1,
          username: "Alice.W",
          email: "alice.wonderland@newdomain.com",
          role: "admin",
          age: 31,
        });
        const reRetrievedAlice = await usersStore.get(userId1);
        console.log("Updated Alice:", reRetrievedAlice);
        console.log(
          "Re-retrieved Alice after update (check revisions):",
          reRetrievedAlice
        );
      } catch (error) {
        console.error("Error updating user data:", error.message);
      }
    } else {
      console.log("Alice ID nicht verfügbar, überspringe Update.");
    }

    console.log("\n--- Attempting to update user with invalid data ---");
    if (userId1) {
      try {
        await usersStore.update({
          id: userId1,
          username: "TooLongUsernameForUpdateAndThisShouldFailSoItsAGoodTest",
          email: "bad-email",
          role: "superadmin",
        });
        console.log(
          "FEHLER: Ungültiger Benutzer wurde aktualisiert, dies sollte nicht passieren!"
        );
      } catch (error) {
        console.warn(
          "Erfolgreich Fehler beim Aktualisieren des Benutzers abgefangen:",
          error.message
        );
      }
    } else {
      console.log("Alice ID nicht verfügbar, überspringe Update-Test.");
    }

    console.log("\n--- Tests for Products Store ---");

    console.log("\n--- Adding valid product data ---");
    let productId1, productId2, productId3;
    try {
      productId1 = await productsStore.add({
        name: "Laptop Pro",
        description:
          "Ein leistungsstarker Laptop für professionelle Anwendungen.",
        price: 1200.5,
        category: "electronics",
      });
      console.log("Added Laptop Pro, ID:", productId1);

      productId2 = await productsStore.add({
        name: "The Great Gatsby",
        description: "Ein klassischer Roman von F. Scott Fitzgerald.",
        price: 15.99,
        category: "books",
      });
      console.log("Added The Great Gatsby, ID:", productId2);

      productId3 = await productsStore.add({
        name: "Casual T-Shirt",
        price: 29.95,
        category: "clothes",
      });
      console.log("Added Casual T-Shirt, ID:", productId3);
    } catch (error) {
      console.error("Error adding valid product data:", error.message);
    }

    console.log("\n--- Attempting to add invalid product data ---");
    try {
      await productsStore.add({
        name: "Short",
        price: -10,
        category: "invalid-category",
      });
      console.log(
        "FEHLER: Ungültiges Produkt wurde hinzugefügt, dies sollte nicht passieren!"
      );
    } catch (error) {
      console.warn(
        "Erfolgreich Fehler beim Hinzufügen des ungültigen Produkts abgefangen:",
        error.message
      );
    }

    console.log("\n--- Finding products by category ---");
    const electronicsProducts = await productsStore.find(
      (product) => product.category === "electronics"
    );
    console.log("Electronics products:", electronicsProducts);

    console.log("\n--- Finding products by price ---");
    const expensiveProducts = await productsStore.find(
      (product) => product.price > 100
    );
    console.log("Products > 100:", expensiveProducts);

    console.log("\n--- Tests for Articles Store ---");

    console.log("\n--- Adding valid article data ---");
    let articleId1;
    try {
      articleId1 = await articlesStore.add({
        title: "Understanding IndexedDB",
        content:
          "IndexedDB is a powerful client-side database. This article provides a comprehensive overview of its features and how to use it effectively in web applications. Make sure the content is long enough.",
        authorId: 101,
        publishDate: Date.now(),
        tags: ["database", "javascript", "web-dev"],
        status: "published",
      });
      console.log("Added Article, ID:", articleId1);
    } catch (error) {
      console.error("Error adding valid article data:", error.message);
    }

    console.log("\n--- Attempting to add invalid article data ---");
    try {
      await articlesStore.add({
        title: "Short",
        content: "Too short content.",
        authorId: 0,
        status: "unknown",
      });
      console.log(
        "FEHLER: Ungültiger Artikel wurde hinzugefügt, dies sollte nicht passieren!"
      );
    } catch (error) {
      console.warn(
        "Erfolgreich Fehler beim Hinzufügen des ungültigen Artikels abgefangen:",
        error.message
      );
    }

    console.log("\n--- Deleting Data ---");

    console.log("\n--- Deleting a user ---");
    if (userId2) {
      await usersStore.delete(userId2);
      console.log("Deleted Bob (ID:", userId2, ")");
    } else {
      console.log("Bob ID nicht verfügbar, überspringe Löschung.");
    }

    const remainingUsers = await usersStore.list();
    console.log("Users after deletion:", remainingUsers);
  } catch (error) {
    console.error("An error occurred during Indibi tests:", error);
  } finally {
    console.log("--- Indibi Tests Finished ---");
  }
}

document.addEventListener("DOMContentLoaded", runIndibiTests);
