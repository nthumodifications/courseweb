import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { describe, expect, mock, test } from "bun:test";

const user = {
  id_token: "test-id-token",
  profile: { name: "Test User", sub: "account-a" },
};
const authState = {
  isAuthenticated: false,
  user: undefined as typeof user | undefined,
  signinRedirect: mock(async () => {}),
  signoutRedirect: mock(async () => {}),
  removeUser: mock(async () => {}),
  clearStaleState: mock(async () => {}),
  revokeTokens: mock(async () => {}),
};

const passthrough = ({ children, ...props }: Record<string, unknown>) =>
  createElement("div", props, children as never);
const button = ({ children, ...props }: Record<string, unknown>) =>
  createElement("button", props, children as never);

mock.module("@courseweb/ui", () => ({
  Button: button,
  AlertDialog: ({ open, children }: Record<string, unknown>) =>
    open ? createElement("div", null, children as never) : null,
  AlertDialogAction: button,
  AlertDialogCancel: button,
  AlertDialogContent: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogTitle: passthrough,
  Checkbox: passthrough,
  Label: passthrough,
}));
mock.module("react-oidc-context", () => ({
  useAuth: () => authState,
}));
mock.module("rxdb-hooks", () => ({ useRxCollection: () => null }));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    common: { cancel: "Cancel" },
    settings: {
      account: {
        title: "Account",
        syncDescription:
          "Sign in to sync your timetable and settings across devices.",
        signin: "Sign In",
        signout: "Sign Out",
        logoutConfimation: "Log out?",
        logoutDescription: "Are you sure you want to log out?",
        keepLocalData: "Keep data locally",
        logout: "Logout",
      },
    },
  }),
}));

const { AccountSection } = await import("./AccountSection");

const renderAccountSection = async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/en/settings",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(AccountSection));
  });
  return { root, container };
};

describe("AccountSection", () => {
  test("shows the sign-in row when signed out", async () => {
    authState.isAuthenticated = false;
    authState.user = undefined;
    const { root, container } = await renderAccountSection();

    expect(container.textContent).toContain("Account");
    expect(container.textContent).toContain("Sign in to sync your timetable");
    expect(container.textContent).toContain("Sign In");
    expect(container.textContent).not.toContain("Sign Out");

    await act(async () => root.unmount());
  });

  test("shows the sign-out row when signed in", async () => {
    authState.isAuthenticated = true;
    authState.user = user;
    const { root, container } = await renderAccountSection();

    expect(container.textContent).toContain("Test User");
    expect(container.textContent).toContain("account-a");
    expect(container.textContent).toContain("Sign Out");
    expect(container.textContent).not.toContain("Sign In");

    await act(async () => root.unmount());
  });
});
