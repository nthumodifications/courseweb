export const AI_SETTINGS_STORAGE_KEY = "ai_settings";
export const LEGACY_HEADLESS_AIS_STORAGE_KEY = "headless_ais";

export const CREDENTIAL_STORAGE_KEYS = [
  AI_SETTINGS_STORAGE_KEY,
  LEGACY_HEADLESS_AIS_STORAGE_KEY,
] as const;

export const CREDENTIAL_STORAGE_PREFIXES = ["oidc."] as const;

export const CREDENTIAL_COOKIE_NAMES = ["ACIXSTORE"] as const;

export interface AiSettings {
  useCustomKey: boolean;
  apiKey?: string;
  savedAt: number;
}

const POST_SIGNIN_REDIRECT_STORAGE_KEY = "redirectUri";
const AI_SETTINGS_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

type StorageLike = Pick<
  Storage,
  "length" | "key" | "getItem" | "setItem" | "removeItem"
>;
type CookieDocument = Pick<Document, "cookie">;

const getBrowserStorage = (kind: "localStorage" | "sessionStorage") =>
  typeof window === "undefined" ? undefined : window[kind];

const getStorageKeys = (storage: StorageLike | undefined) => {
  if (!storage) return [];

  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }
  return keys;
};

const isCredentialStorageKey = (key: string) =>
  CREDENTIAL_STORAGE_KEYS.includes(
    key as (typeof CREDENTIAL_STORAGE_KEYS)[number],
  ) || CREDENTIAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));

const removeCredentialCookies = (
  cookieDocument: CookieDocument | undefined,
) => {
  if (!cookieDocument) return;

  for (const name of CREDENTIAL_COOKIE_NAMES) {
    try {
      cookieDocument.cookie = `${name}=; Max-Age=0; path=/`;
    } catch {
      // Cookie access may be unavailable in privacy-restricted contexts.
    }
  }
};

const removeCredentialStorageKeys = (storage: StorageLike | undefined) => {
  if (!storage) return;

  for (const key of getStorageKeys(storage)) {
    if (!isCredentialStorageKey(key)) continue;
    try {
      storage.removeItem(key);
    } catch {
      // Storage may be unavailable or become full between operations.
    }
  }
};

const removeStorageKey = (storage: StorageLike | undefined, key: string) => {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage may be unavailable in privacy-restricted contexts.
  }
};

const readStorageKey = (storage: StorageLike | undefined, key: string) => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const getNow = (clock: () => number): number => {
  try {
    const value = clock();
    return Number.isFinite(value) ? value : Date.now();
  } catch {
    return Date.now();
  }
};

const parseAiSettings = (
  value: string | null,
):
  | (Omit<AiSettings, "savedAt"> & {
      savedAt?: number;
    })
  | null => {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;

    const settings = parsed as {
      useCustomKey?: unknown;
      apiKey?: unknown;
      savedAt?: unknown;
    };
    if (typeof settings.useCustomKey !== "boolean") return null;
    if (settings.apiKey !== undefined && typeof settings.apiKey !== "string") {
      return null;
    }
    if (
      settings.savedAt !== undefined &&
      typeof settings.savedAt !== "number"
    ) {
      return null;
    }

    return {
      useCustomKey: settings.useCustomKey,
      ...(settings.apiKey === undefined ? {} : { apiKey: settings.apiKey }),
      ...(settings.savedAt === undefined ? {} : { savedAt: settings.savedAt }),
    };
  } catch {
    return null;
  }
};

/** Reads the custom AI key and expires or migrates its local record. */
export const readAiSettings = (
  storage = getBrowserStorage("localStorage"),
  clock: () => number = Date.now,
): AiSettings | null => {
  const raw = readStorageKey(storage, AI_SETTINGS_STORAGE_KEY);
  const parsed = parseAiSettings(raw);
  if (!parsed) {
    if (raw !== null) removeStorageKey(storage, AI_SETTINGS_STORAGE_KEY);
    return null;
  }

  const now = getNow(clock);
  const savedAt = parsed.savedAt ?? now;
  if (now - savedAt > AI_SETTINGS_MAX_AGE_MS) {
    removeStorageKey(storage, AI_SETTINGS_STORAGE_KEY);
    return null;
  }

  const settings: AiSettings = {
    useCustomKey: parsed.useCustomKey,
    ...(parsed.apiKey === undefined ? {} : { apiKey: parsed.apiKey }),
    savedAt,
  };
  if (parsed.savedAt === undefined) {
    try {
      storage?.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage may be unavailable in privacy-restricted contexts.
    }
  }
  return settings;
};

/** Writes only the custom AI setting and its timestamp to local storage. */
export const writeAiSettings = (
  settings: { useCustomKey: boolean; apiKey?: string },
  storage = getBrowserStorage("localStorage"),
  clock: () => number = Date.now,
) => {
  const savedAt = getNow(clock);
  const stored = {
    useCustomKey: settings.useCustomKey,
    ...(settings.useCustomKey && settings.apiKey !== undefined
      ? { apiKey: settings.apiKey }
      : {}),
    savedAt,
  };
  try {
    storage?.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage may be unavailable in privacy-restricted contexts.
  }
};

const isSafePostSigninRedirect = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return false;
  }
  return !/^[a-z][a-z\d+.-]*:/i.test(value);
};

export const rememberPostSigninRedirect = (
  value: unknown,
  storage = getBrowserStorage("localStorage"),
) => {
  if (isSafePostSigninRedirect(value)) {
    try {
      storage?.setItem(POST_SIGNIN_REDIRECT_STORAGE_KEY, value);
    } catch {
      // Storage may be unavailable in privacy-restricted contexts.
    }
  } else {
    removeStorageKey(storage, POST_SIGNIN_REDIRECT_STORAGE_KEY);
  }
};

/** Reads and removes the one-shot post-sign-in redirect. */
export const consumePostSigninRedirect = (
  storage = getBrowserStorage("localStorage"),
) => {
  const value = readStorageKey(storage, POST_SIGNIN_REDIRECT_STORAGE_KEY);
  removeStorageKey(storage, POST_SIGNIN_REDIRECT_STORAGE_KEY);
  return isSafePostSigninRedirect(value) ? value : "/";
};

/** Removes leftovers from the removed proxy-login feature on startup. */
export const removeLegacyCredentialStorage = (
  localStorage = getBrowserStorage("localStorage"),
  sessionStorage = getBrowserStorage("sessionStorage"),
  cookieDocument = typeof document === "undefined" ? undefined : document,
) => {
  removeStorageKey(localStorage, LEGACY_HEADLESS_AIS_STORAGE_KEY);
  removeStorageKey(sessionStorage, LEGACY_HEADLESS_AIS_STORAGE_KEY);
  removeCredentialCookies(cookieDocument);
};

/** Removes every credential-like value owned by the web client. */
export const clearCredentialStorage = (
  localStorage = getBrowserStorage("localStorage"),
  sessionStorage = getBrowserStorage("sessionStorage"),
  cookieDocument = typeof document === "undefined" ? undefined : document,
) => {
  removeCredentialStorageKeys(localStorage);
  removeCredentialStorageKeys(sessionStorage);
  removeCredentialCookies(cookieDocument);
};
