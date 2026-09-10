const CHUNK_RECOVERY_SESSION_KEY = "nthumods:chunk-recovery-attempted";
const CHUNK_ERROR_PATTERN =
  /is not a valid JavaScript MIME type|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i;

let recoveryAttempted = false;
let reloadPromise: Promise<void> | null = null;

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "";
}

function isChunkError(error: unknown): boolean {
  return CHUNK_ERROR_PATTERN.test(errorMessage(error));
}

async function unregisterServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          await registration.unregister();
        } catch {
          // Continue clearing the remaining registrations before reloading.
        }
      }),
    );
  } catch {
    // A missing or unavailable service-worker API should not block recovery.
  }
}

async function deleteCaches(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(async (cacheName) => {
        try {
          await caches.delete(cacheName);
        } catch {
          // Continue deleting the remaining caches before reloading.
        }
      }),
    );
  } catch {
    // A missing or unavailable Cache Storage API should not block recovery.
  }
}

export function reloadApp(): Promise<void> {
  if (reloadPromise) return reloadPromise;

  reloadPromise = (async () => {
    await Promise.all([unregisterServiceWorkers(), deleteCaches()]);
    window.location.reload();
  })();

  return reloadPromise;
}

function shouldRecover(): boolean {
  if (recoveryAttempted) return false;
  recoveryAttempted = true;

  try {
    if (window.sessionStorage.getItem(CHUNK_RECOVERY_SESSION_KEY)) {
      return false;
    }
    window.sessionStorage.setItem(CHUNK_RECOVERY_SESSION_KEY, "1");
  } catch {
    // Keep the in-memory guard if sessionStorage is unavailable.
  }

  return true;
}

export function recoverFromChunkError(): Promise<void> {
  return shouldRecover() ? reloadApp() : Promise.resolve();
}

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    void recoverFromChunkError();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkError(event.reason)) {
      void recoverFromChunkError();
    }
  });

  window.addEventListener("error", (event) => {
    if (isChunkError(event.message) || isChunkError(event.error)) {
      void recoverFromChunkError();
    }
  });
}
