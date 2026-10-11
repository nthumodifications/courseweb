export const AI_SETTINGS_STORAGE_KEY = "ai_settings";
export const LEGACY_HEADLESS_AIS_STORAGE_KEY = "headless_ais";

export const CREDENTIAL_STORAGE_KEYS = [
  AI_SETTINGS_STORAGE_KEY,
  LEGACY_HEADLESS_AIS_STORAGE_KEY,
] as const;

export const CREDENTIAL_STORAGE_PREFIXES = ["oidc."] as const;

export const CREDENTIAL_COOKIE_NAMES = ["ACIXSTORE"] as const;

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
