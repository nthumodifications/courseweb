import { JSDOM } from "jsdom";
import { describe, expect, test } from "bun:test";
import { WebStorageStateStore } from "oidc-client-ts";
import {
  clearCredentialStorage,
  removeLegacyCredentialStorage,
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

  test("keeps the AI key across a fresh page load", () => {
    const dom = createStorage();
    const localStorage = dom.window.localStorage;
    const sessionStorage = dom.window.sessionStorage;

    const aiSettings = JSON.stringify({
      useCustomKey: true,
      apiKey: "gemini-key",
    });
    localStorage.setItem("ai_settings", aiSettings);

    expect(sessionStorage).toHaveLength(0);
    expect(localStorage.getItem("ai_settings")).toBe(aiSettings);

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
