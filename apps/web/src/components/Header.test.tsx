import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterAll, describe, expect, mock, test } from "bun:test";
import {
  getSyncedStorageBackupKey,
  getSyncedStorageKey,
} from "@/hooks/syncedStorage";

const user = {
  id_token: "test-id-token",
  profile: { name: "Test User", sub: "account-a" },
};
const signoutRedirect = mock(async () => {});
const removeUser = mock(async () => {});
const clearStaleState = mock(async () => {});
const revokeTokens = mock(async () => {});
const actualUi = await import("@courseweb/ui");
const actualIcons = await import("lucide-react");
const actualOidcContext = await import("react-oidc-context");
const actualRxdbHooks = await import("rxdb-hooks");
const actualDictionary = await import("@/dictionaries/useDictionary");

const passthrough = ({ children, ...props }: Record<string, unknown>) =>
  createElement("div", props, children as never);
const button = ({ children, ...props }: Record<string, unknown>) =>
  createElement("button", props, children as never);
const dropdownMenu = ({ children }: Record<string, unknown>) =>
  createElement("div", null, children as never);

const storageKeysFor = (key: string) => [
  getSyncedStorageKey(key, user.profile.sub),
  getSyncedStorageKey(key),
  key,
];

const forEachStorageKey = (keys: string[], callback: (key: string) => void) => {
  for (const key of keys) {
    for (const storageKey of storageKeysFor(key)) callback(storageKey);
  }
};

mock.module("@courseweb/ui", () => ({
  SidebarTrigger: button,
  DropdownMenu: dropdownMenu,
  DropdownMenuContent: passthrough,
  DropdownMenuItem: button,
  DropdownMenuLabel: passthrough,
  DropdownMenuSeparator: passthrough,
  DropdownMenuTrigger: passthrough,
  Button: button,
  Checkbox: ({ checked, onCheckedChange, ...props }: Record<string, unknown>) =>
    createElement("input", {
      ...props,
      type: "checkbox",
      checked,
      onChange: (event: { target: { checked: boolean } }) =>
        (onCheckedChange as ((value: boolean) => void) | undefined)?.(
          event.target.checked,
        ),
    }),
  Label: passthrough,
  AlertDialog: ({ open, children }: Record<string, unknown>) =>
    open ? createElement("div", null, children as never) : null,
  AlertDialogAction: button,
  AlertDialogCancel: button,
  AlertDialogContent: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogTitle: passthrough,
  useIsMobile: () => false,
}));
mock.module("lucide-react", () => ({ LogIn: () => null, LogOut: () => null }));
mock.module("react-oidc-context", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user,
    signoutRedirect,
    removeUser,
    clearStaleState,
    revokeTokens,
  }),
}));
mock.module("rxdb-hooks", () => ({ useRxCollection: () => null }));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    common: { cancel: "Cancel" },
    settings: {
      account: {
        signout: "Sign out",
        signin: "Sign in",
        logoutConfimation: "Confirm logout",
        logoutDescription: "Clear local data?",
        keepLocalData: "Keep local data",
        logout: "Log out",
      },
    },
  }),
}));

const { default: Header } = await import("./Header");

describe("Header local-data logout", () => {
  afterAll(() => {
    mock.module("@courseweb/ui", () => actualUi);
    mock.module("lucide-react", () => actualIcons);
    mock.module("react-oidc-context", () => actualOidcContext);
    mock.module("rxdb-hooks", () => actualRxdbHooks);
    mock.module("@/dictionaries/useDictionary", () => actualDictionary);
  });

  test("clears synced records and their backups when local data is not kept", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/",
    });
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      localStorage: dom.window.localStorage,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    const storageKeys = ["courses", "grades"];
    forEachStorageKey(storageKeys, (storageKey) => {
      window.localStorage.setItem(storageKey, "record");
      window.localStorage.setItem(
        getSyncedStorageBackupKey(storageKey),
        "backup",
      );
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(Header));
    });

    const signoutButton = [...document.querySelectorAll("button")].find(
      (element) => element.textContent === "Sign out",
    );
    expect(signoutButton).toBeDefined();
    await act(async () => signoutButton?.click());
    const checkbox = document.getElementById("keepData") as HTMLInputElement;
    await act(async () => checkbox.click());
    const logoutButton = [...document.querySelectorAll("button")].find(
      (element) => element.textContent === "Log out",
    );
    await act(async () => logoutButton?.click());

    forEachStorageKey(storageKeys, (storageKey) => {
      expect(window.localStorage.getItem(storageKey)).toBeNull();
      expect(
        window.localStorage.getItem(getSyncedStorageBackupKey(storageKey)),
      ).toBeNull();
    });

    await act(async () => root.unmount());
  });
});
