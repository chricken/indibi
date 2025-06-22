// prüfung der validierung der daten bei add und update
// normaler ablauf, wenn sich alles in vorgegebenen bahnen bewegt.

import indibi from "./indibi.js";

async function runMinimalSuccessfulIndibiTests() {
  console.log("--- Starting Minimal Successful Indibi Tests ---");

  try {
    const dbContext = await indibi.init({
      dbName: "MyTestOhneFehlerausloeser",
      dbVersion: 1,
      objectstores: ["users"],
    });

    console.log("Database initialized:", dbContext);

    const usersStore = dbContext.stores.users;

    if (!usersStore) {
      console.error(
        "Error: Could not get the expected StoreManager for 'users'. Check objectstore creation and names."
      );
      return;
    }

    console.log("\n--- Successful Users Store Operations ---");

    const user1Data = {
      username: "MinimalUser",
      email: "minimal.user@example.com",
      role: "viewer",
      age: 25,
    };
    const userId1 = await usersStore.add(user1Data);
    console.log("Added MinimalUser, ID:", userId1);

    const allUsersAfterAdd = await usersStore.list();
    console.log("All users after adding:", allUsersAfterAdd);

    const retrievedUser = await usersStore.get(userId1);
    console.log("Retrieved MinimalUser:", retrievedUser);

    const updateData = {
      id: userId1,
      email: "minimal.updated@example.com",
      role: "editor",
    };
    await usersStore.update(updateData);
    const updatedUser = await usersStore.get(userId1);
    console.log("Updated MinimalUser:", updatedUser);

    await usersStore.delete(userId1);
    console.log("Deleted MinimalUser (ID:", userId1, ")");

    const allUsersAfterDelete = await usersStore.list();
    console.log("All users after deletion:", allUsersAfterDelete);
  } catch (error) {
    console.error(
      "An unexpected error occurred during minimal successful Indibi tests:",
      error
    );
  } finally {
    console.log("--- Minimal Successful Indibi Tests Finished ---");
  }
}

document.addEventListener("DOMContentLoaded", runMinimalSuccessfulIndibiTests);
