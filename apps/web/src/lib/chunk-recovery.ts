import {
  lazy as reactLazy,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

const CHUNK_RECOVERY_SESSION_KEY = "nthumods:chunk-recovery-attempted";
const CHUNK_RECOVERY_WINDOW_MS = 5 * 60 * 1000;
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

function isOnline(): boolean {
  try {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  } catch {
    return false;
  }
}

async function updateServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  } catch {
    // A failed update check should not prevent the normal reload recovery.
  }
}

function shouldRecover(): boolean {
  if (recoveryAttempted) return false;
  if (typeof window === "undefined") return false;
  if (!isOnline()) return false;

  try {
    const storedAttempt = window.sessionStorage.getItem(
      CHUNK_RECOVERY_SESSION_KEY,
    );
    const attemptedAt = storedAttempt ? Number(storedAttempt) : NaN;
    const now = Date.now();
    if (
      Number.isFinite(attemptedAt) &&
      attemptedAt >= 0 &&
      (attemptedAt >= now || now - attemptedAt < CHUNK_RECOVERY_WINDOW_MS)
    ) {
      recoveryAttempted = true;
      return false;
    }
  } catch {
    // Without a persistent cross-page guard, automatic reload is unsafe.
    recoveryAttempted = true;
    return false;
  }

  recoveryAttempted = true;
  return true;
}

export function reloadApp(): Promise<void> {
  if (reloadPromise) return reloadPromise;

  reloadPromise = (async () => {
    await updateServiceWorker();
    if (typeof window === "undefined" || !isOnline()) return;

    try {
      window.sessionStorage.setItem(
        CHUNK_RECOVERY_SESSION_KEY,
        String(Date.now()),
      );
    } catch {
      // Without a persistent cross-page guard, automatic reload is unsafe.
      return;
    }

    // If connectivity drops during reload, the SW offline navigation fallback
    // serves the shell; the guard blocks another reload.
    if (isOnline()) window.location.reload();
  })();

  return reloadPromise;
}

export async function recoverFromChunkError(): Promise<void> {
  if (!shouldRecover()) return;

  try {
    await reloadApp();
  } catch {
    // Preserve the original lazy-import error for the existing error boundary.
  }
}

export async function loadWithRetry<T>(importer: () => Promise<T>): Promise<T> {
  try {
    return await importer();
  } catch (error) {
    if (!isChunkError(error)) throw error;
    await recoverFromChunkError();
    throw error;
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return reactLazy(async () => {
    return loadWithRetry(importer);
  }) as unknown as LazyExoticComponent<T>;
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
