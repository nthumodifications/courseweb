/**
 * Utility to clear calendar v2 collections from IndexedDB
 *
 * Use this when schema validation fails due to incompatible data.
 * Run in browser console: window.__clearCalendarDB()
 */

export async function clearCalendarDB() {
  try {
    console.log("[ClearDB] Clearing calendar v2 collections...");

    // Close any existing connections
    const databases = await indexedDB.databases?.();
    const dbName = "nthumods-calendar";

    // Find and close the database
    const dbInfo = databases?.find((db) => db.name === dbName);
    if (dbInfo) {
      console.log(`[ClearDB] Found database: ${dbName}`);
    }

    // Delete IndexedDB
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);

      request.onsuccess = () => {
        console.log("[ClearDB] Database cleared successfully");
        console.log("[ClearDB] Reloading page...");
        // Force reload to reinitialize with clean database
        window.location.reload();
        resolve();
      };

      request.onerror = (event) => {
        console.error("[ClearDB] Error clearing database:", event);
        reject(event);
      };

      request.onblocked = () => {
        console.warn(
          "[ClearDB] Database deletion blocked. Close all tabs and try again.",
        );
      };
    });
  } catch (error) {
    console.error("[ClearDB] Failed to clear database:", error);
    throw error;
  }
}

// Expose to window for browser console access
if (typeof window !== "undefined") {
  (window as any).__clearCalendarDB = clearCalendarDB;
  console.log(
    "[ClearDB] Utility loaded. Run window.__clearCalendarDB() to clear calendar database.",
  );
}
