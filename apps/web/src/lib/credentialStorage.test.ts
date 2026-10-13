import { JSDOM } from "jsdom";
import { describe, expect, test } from "bun:test";
import { WebStorageStateStore } from "oidc-client-ts";
import {
  clearCredentialStorage,
  consumePostSigninRedirect,
  readAiSettings,
  rememberPostSigninRedirect,
  removeLegacyCredentialStorage,
  writeAiSettings,
} from "./credentialStorage";

const createStorage = () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://example.test/",
  });
  return dom;
};

describe("credential storage", () => {
  test("keeps a signed-in OIDC session across a fresh page load", async () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const sessionStorage = dom.window.sessionStorage;
    const oidcKey = "oidc.user:https://auth.example.test:courseweb";
    const oidcValue = '{"refresh_token":"refresh-token"}';

    await new WebStorageStateStore({ store: localStorage }).set(
      oidcKey,
      oidcValue,
    );
    const freshPageOidcStore = new WebStorageStateStore({
      store: localStorage,
    });

    expect(await freshPageOidcStore.get(oidcKey)).toBe(oidcValue);
    expect(sessionStorage).toHaveLength(0);

    dom.window.close();
  });

  test("round-trips a fresh AI key with its save time", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const now = 1_700_000_000_000;

    writeAiSettings(
      { useCustomKey: true, apiKey: "gemini-key" },
      localStorage,
      () => now,
    );

    expect(readAiSettings(localStorage, () => now)).toEqual({
      useCustomKey: true,
      apiKey: "gemini-key",
      savedAt: now,
    });

    dom.window.close();
  });

  test.each([
    [89, true],
    [91, false],
  ])("expires an AI key at %i days", (ageInDays, expectedPresent) => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const now = 1_700_000_000_000;
    const savedAt = now - ageInDays * 24 * 60 * 60 * 1000;

    localStorage.setItem(
      "ai_settings",
      JSON.stringify({ useCustomKey: true, apiKey: "gemini-key", savedAt }),
    );

    expect(readAiSettings(localStorage, () => now)).toEqual(
      expectedPresent
        ? { useCustomKey: true, apiKey: "gemini-key", savedAt }
        : null,
    );
    if (expectedPresent) {
      expect(localStorage.getItem("ai_settings")).not.toBeNull();
    } else {
      expect(localStorage.getItem("ai_settings")).toBeNull();
    }

    dom.window.close();
  });

  test("stamps a legacy AI key on first read", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const now = 1_700_000_000_000;
    localStorage.setItem(
      "ai_settings",
      JSON.stringify({ useCustomKey: true, apiKey: "legacy-key" }),
    );

    expect(readAiSettings(localStorage, () => now)).toEqual({
      useCustomKey: true,
      apiKey: "legacy-key",
      savedAt: now,
    });
    expect(JSON.parse(localStorage.getItem("ai_settings")!)).toEqual({
      useCustomKey: true,
      apiKey: "legacy-key",
      savedAt: now,
    });

    dom.window.close();
  });

  test("removes malformed AI settings without throwing", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    localStorage.setItem("ai_settings", "not-json");

    expect(() =>
      readAiSettings(localStorage, () => 1_700_000_000_000),
    ).not.toThrow();
    expect(readAiSettings(localStorage, () => 1_700_000_000_000)).toBeNull();
    expect(localStorage.getItem("ai_settings")).toBeNull();

    dom.window.close();
  });

  test("removes AI settings with wrong field types", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    localStorage.setItem(
      "ai_settings",
      JSON.stringify({ useCustomKey: "yes", apiKey: "gemini-key" }),
    );

    expect(readAiSettings(localStorage, () => 1_700_000_000_000)).toBeNull();
    expect(localStorage.getItem("ai_settings")).toBeNull();

    dom.window.close();
  });

  test("does not persist an AI key when custom-key use is disabled", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;

    writeAiSettings(
      { useCustomKey: false, apiKey: "must-not-persist" },
      localStorage,
      () => 1_700_000_000_000,
    );

    expect(JSON.parse(localStorage.getItem("ai_settings")!)).toEqual({
      useCustomKey: false,
      savedAt: 1_700_000_000_000,
    });
    expect(localStorage.getItem("ai_settings")).not.toContain(
      "must-not-persist",
    );

    dom.window.close();
  });

  test("accepts and consumes only same-origin post-sign-in paths", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const accepted = ["/zh/chat", "/en/student/grades?x=1#y"];
    const rejected = [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "",
      null,
      "/en/chat\n/evil",
    ];

    for (const value of accepted) {
      rememberPostSigninRedirect(value, localStorage);
      expect(consumePostSigninRedirect(localStorage)).toBe(value);
      expect(localStorage.getItem("redirectUri")).toBeNull();
    }

    for (const value of rejected) {
      rememberPostSigninRedirect(value, localStorage);
      expect(consumePostSigninRedirect(localStorage)).toBe("/");
      expect(localStorage.getItem("redirectUri")).toBeNull();
    }

    dom.window.close();
  });

  test("sign-out clears every registered credential key from both stores", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const sessionStorage = dom.window.sessionStorage;

    const credentialKeys = [
      "oidc.user:https://auth.example.test:courseweb",
      "oidc.signinState:state",
      "ai_settings",
      "headless_ais",
    ];
    for (const key of credentialKeys) {
      localStorage.setItem(key, "credential");
      sessionStorage.setItem(key, "credential");
    }
    localStorage.setItem("ordinary-setting", "keep");
    dom.window.document.cookie = "ACIXSTORE=legacy; path=/";

    clearCredentialStorage(localStorage, sessionStorage, dom.window.document);

    for (const key of credentialKeys) {
      expect(localStorage.getItem(key)).toBeNull();
      expect(sessionStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem("ordinary-setting")).toBe("keep");
    expect(dom.window.document.cookie).not.toContain("ACIXSTORE=");

    dom.window.close();
  });

  test("startup cleanup deletes legacy keys", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const sessionStorage = dom.window.sessionStorage;

    localStorage.setItem("headless_ais", "legacy");
    sessionStorage.setItem("headless_ais", "legacy");
    dom.window.document.cookie = "ACIXSTORE=legacy; path=/";

    removeLegacyCredentialStorage(
      localStorage,
      sessionStorage,
      dom.window.document,
    );

    expect(localStorage.getItem("headless_ais")).toBeNull();
    expect(sessionStorage.getItem("headless_ais")).toBeNull();
    expect(dom.window.document.cookie).not.toContain("ACIXSTORE=");

    dom.window.close();
  });

  test("startup cleanup preserves live OIDC tokens and AI keys", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const sessionStorage = dom.window.sessionStorage;

    const oidcKey = "oidc.user:https://auth.example.test:courseweb";
    localStorage.setItem(oidcKey, "live-token");
    sessionStorage.setItem(oidcKey, "live-token");
    const aiSettings = JSON.stringify({
      useCustomKey: true,
      apiKey: "gemini-key",
    });
    localStorage.setItem("ai_settings", aiSettings);
    sessionStorage.setItem("ai_settings", aiSettings);
    localStorage.setItem("headless_ais", "legacy");
    sessionStorage.setItem("headless_ais", "legacy");
    dom.window.document.cookie = "ACIXSTORE=legacy; path=/";

    removeLegacyCredentialStorage(
      localStorage,
      sessionStorage,
      dom.window.document,
    );

    expect(localStorage.getItem(oidcKey)).toBe("live-token");
    expect(sessionStorage.getItem(oidcKey)).toBe("live-token");
    expect(localStorage.getItem("ai_settings")).toContain("gemini-key");
    expect(sessionStorage.getItem("ai_settings")).toContain("gemini-key");

    dom.window.close();
  });
});
