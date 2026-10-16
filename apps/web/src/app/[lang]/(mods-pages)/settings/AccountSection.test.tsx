import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { captureGlobalState } from "@/test-utils/global-state";
import {
  getCourseBackupKey,
  getSyncedStorageNamespace,
  listCourseBackups,
} from "@/hooks/syncedStorage";
import { SettingsSearchProvider } from "./settingsSearch";

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
const timetableState = {
  courses: {} as Record<string, string[]>,
  timetableDataReady: false,
  timetableSyncError: false,
  timetableSyncStatus: {
    uploading: false,
    uploadFailed: false,
    lastSyncedAt: null as number | null,
  },
  restoreCourses: mock((_courses: Record<string, string[]>) => {}),
};
const settingsState = { language: "en" as "en" | "zh" | "zh-cn" };
const actualDictionary = await import("@/dictionaries/useDictionary");

const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "localStorage",
  "IS_REACT_ACT_ENVIRONMENT",
]);
const moduleDom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  window: moduleDom.window,
  document: moduleDom.window.document,
  navigator: moduleDom.window.navigator,
});
const actualUi = await import("@courseweb/ui");
const actualOidcContext = await import("react-oidc-context");
const actualRxdbHooks = await import("rxdb-hooks");
moduleDom.window.close();
restoreGlobals();
let activeDom: JSDOM | undefined;

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
  Dialog: ({ open, children }: Record<string, unknown>) =>
    open ? createElement("div", { role: "dialog" }, children as never) : null,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogFooter: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
}));
mock.module("react-oidc-context", () => ({
  useAuth: () => authState,
}));
mock.module("rxdb-hooks", () => ({ useRxCollection: () => null }));
mock.module("@/hooks/contexts/useUserTimetable", () => ({
  default: () => timetableState,
}));
mock.module("@/hooks/contexts/settings", () => ({
  useSettings: () => settingsState,
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    common: { cancel: "Cancel" },
    settings: {
      account: {
        title: "Account",
        syncDescription:
          "Sign in to sync your timetable and settings across devices.",
        signin: "Sign In",
        signout: settingsState.language === "zh" ? "登出" : "Sign Out",
        logoutConfimation: "Log out?",
        logoutDescription: "Are you sure you want to log out?",
        keepLocalData: "Keep data locally",
        logout: "Logout",
        syncTitle: "Timetable sync",
        syncStatus: {
          signedOut: "Saved on this device only",
          syncing: "Syncing",
          synced: "Last synced {time}",
          syncedNoTime: "Synced",
          error: "Sync failed; saved on this device",
        },
        restoreTitle: "Restore timetable backup",
        restoreDescription: "Choose a local backup to restore.",
        restoreSyncErrorDescription:
          "Restore is available once sync works again.",
        restoreAction: "Restore from backup",
        restoreSavedAt: "Saved {time}",
        restoreSummary: "{semesters} semesters · {courses} courses",
        restoreConfirmTitle: "Restore this timetable?",
        restoreConfirmDescription:
          "This replaces your current timetable. Your current timetable will be backed up first.",
        restoreConfirmDescriptionEmpty: "Your current timetable is empty.",
        restoreConfirm: "Restore",
      },
    },
  }),
}));

const { AccountSection, getTimetableSyncStatus } = await import(
  "./AccountSection"
);
mock.module("@/dictionaries/useDictionary", () => actualDictionary);

const renderAccountSection = async (
  setup?: (dom: JSDOM) => void,
  searchQuery = "",
) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/en/settings",
  });
  activeDom = dom;
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  setup?.(dom);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      searchQuery
        ? createElement(
            SettingsSearchProvider,
            { query: searchQuery },
            createElement(AccountSection),
          )
        : createElement(AccountSection),
    );
  });
  return { root, container };
};

const renderAccountSectionWithBackup = (
  namespace: string,
  value: Record<string, string[]>,
) =>
  renderAccountSection((dom) => {
    dom.window.localStorage.setItem(
      getCourseBackupKey(namespace),
      JSON.stringify([{ savedAt: Date.now(), value }]),
    );
  });

describe("AccountSection", () => {
  afterEach(() => {
    timetableState.courses = {};
    timetableState.timetableDataReady = false;
    timetableState.timetableSyncError = false;
    timetableState.timetableSyncStatus = {
      uploading: false,
      uploadFailed: false,
      lastSyncedAt: null,
    };
    settingsState.language = "en";
    timetableState.restoreCourses.mockReset();
  });

  test("derives signed-out, syncing, synced, and error status", () => {
    expect(
      getTimetableSyncStatus({
        signedIn: false,
        timetableDataReady: false,
        timetableSyncError: false,
        timetableSyncStatus: {
          uploading: false,
          uploadFailed: false,
          lastSyncedAt: null,
        },
      }),
    ).toBe("signed-out");
    expect(
      getTimetableSyncStatus({
        signedIn: true,
        timetableDataReady: false,
        timetableSyncError: false,
        timetableSyncStatus: {
          uploading: true,
          uploadFailed: false,
          lastSyncedAt: null,
        },
      }),
    ).toBe("syncing");
    expect(
      getTimetableSyncStatus({
        signedIn: true,
        timetableDataReady: true,
        timetableSyncError: false,
        timetableSyncStatus: {
          uploading: false,
          uploadFailed: false,
          lastSyncedAt: 1,
        },
      }),
    ).toBe("synced");
    expect(
      getTimetableSyncStatus({
        signedIn: true,
        timetableDataReady: true,
        timetableSyncError: true,
        timetableSyncStatus: {
          uploading: false,
          uploadFailed: false,
          lastSyncedAt: 1,
        },
      }),
    ).toBe("error");
  });

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
    const first = await renderAccountSection();

    expect(first.container.textContent).toContain("Test User");
    expect(first.container.textContent).toContain("account-a");
    expect(first.container.textContent).toContain("Sign Out");
    expect(first.container.textContent).not.toContain("Sign In");

    await act(async () => first.root.unmount());

    const searched = await renderAccountSection(undefined, "Sign Out");
    expect(searched.container.querySelector("#account")).not.toBeNull();
    expect(searched.container.querySelector("#setting-account")).not.toBeNull();
    expect(
      searched.container.querySelector("#setting-account")?.textContent,
    ).toContain("Sign Out");
    expect(searched.container.querySelector("#setting-sync-status")).toBeNull();

    await act(async () => searched.root.unmount());
  });

  test("renders backup count and semester summary", async () => {
    authState.isAuthenticated = false;
    authState.user = undefined;
    timetableState.timetableDataReady = true;
    const namespace = getSyncedStorageNamespace();
    const { root, container } = await renderAccountSectionWithBackup(
      namespace,
      {
        "11410": ["COURSE-1", "COURSE-2"],
        "11510": ["COURSE-3"],
      },
    );

    expect(container.textContent).toContain("Restore from backup");
    expect(container.querySelector("#setting-restore-backup")).not.toBeNull();
    expect(container.textContent).not.toContain("2 semesters · 3 courses");

    const restoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore from backup",
    );
    expect(restoreButton).toBeDefined();
    await act(async () => restoreButton?.click());

    expect(container.textContent).toContain("2 semesters · 3 courses");
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    await act(async () => root.unmount());
  });

  test("backs up the current timetable before restoring through the timetable updater", async () => {
    authState.isAuthenticated = false;
    authState.user = undefined;
    timetableState.timetableDataReady = true;
    const namespace = getSyncedStorageNamespace();
    const currentCourses = { "11410": ["CURRENT-COURSE"] };
    const restoredCourses = {
      "11410": ["RESTORED-COURSE"],
      "11510": ["RESTORED-SECOND-COURSE"],
    };
    timetableState.courses = currentCourses;
    const { root, container } = await renderAccountSectionWithBackup(
      namespace,
      restoredCourses,
    );
    const restoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore from backup",
    );
    await act(async () => restoreButton?.click());
    const backupChoice = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("2 semesters · 2 courses"),
    );
    await act(async () => backupChoice?.click());
    expect(container.textContent).toContain(
      "Your current timetable will be backed up first.",
    );
    const confirmButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore",
    );
    await act(async () => confirmButton?.click());

    expect(timetableState.restoreCourses).toHaveBeenCalledWith(restoredCourses);
    expect(listCourseBackups(namespace)[0]?.value).toEqual(currentCourses);

    await act(async () => root.unmount());
  });

  test("uses empty-current copy when restoring over an empty timetable", async () => {
    authState.isAuthenticated = false;
    authState.user = undefined;
    timetableState.timetableDataReady = true;
    timetableState.courses = {};
    const namespace = getSyncedStorageNamespace();
    const restoredCourses = { "11410": ["RESTORED-COURSE"] };
    const { root, container } = await renderAccountSectionWithBackup(
      namespace,
      restoredCourses,
    );
    const restoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore from backup",
    );
    await act(async () => restoreButton?.click());
    const backupChoice = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("1 semesters · 1 courses"),
    );
    await act(async () => backupChoice?.click());

    expect(container.textContent).toContain("Your current timetable is empty.");
    expect(container.textContent).not.toContain(
      "Your current timetable will be backed up first.",
    );

    await act(async () => root.unmount());
  });

  test("disables signed-in restore while the timetable read has failed", async () => {
    authState.isAuthenticated = true;
    authState.user = user;
    timetableState.timetableDataReady = true;
    timetableState.timetableSyncError = false;
    const namespace = getSyncedStorageNamespace(user.profile.sub);
    const restoredCourses = { "11410": ["RESTORED-COURSE"] };
    const { root, container } = await renderAccountSectionWithBackup(
      namespace,
      restoredCourses,
    );
    const restoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore from backup",
    );
    expect(restoreButton?.disabled).toBe(false);
    await act(async () => restoreButton?.click());
    const backupChoice = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("1 semesters · 1 courses"),
    );
    await act(async () => backupChoice?.click());
    const readyConfirmButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore",
    );
    expect(readyConfirmButton?.disabled).toBe(false);

    timetableState.timetableSyncError = true;
    await act(async () => root.render(createElement(AccountSection)));
    const failedRestoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore from backup",
    );
    const failedConfirmButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore",
    );
    expect(failedRestoreButton?.disabled).toBe(true);
    expect(failedConfirmButton?.disabled).toBe(true);
    expect(container.textContent).toContain(
      "Restore is available once sync works again.",
    );

    await act(async () => root.unmount());
  });

  test("gates restore until settled and replaces the current timetable", async () => {
    authState.isAuthenticated = true;
    authState.user = user;
    const namespace = getSyncedStorageNamespace(user.profile.sub);
    const currentCourses = { "11410": ["CURRENT-COURSE"] };
    const restoredCourses = { "11410": ["RESTORED-COURSE"] };
    timetableState.courses = currentCourses;
    timetableState.timetableSyncStatus = {
      uploading: true,
      uploadFailed: false,
      lastSyncedAt: null,
    };
    timetableState.restoreCourses.mockImplementation((nextCourses) => {
      timetableState.courses = nextCourses;
    });
    const { root, container } = await renderAccountSectionWithBackup(
      namespace,
      restoredCourses,
    );
    const restoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore from backup",
    );
    expect(restoreButton?.disabled).toBe(true);

    timetableState.timetableSyncStatus = {
      uploading: false,
      uploadFailed: false,
      lastSyncedAt: 1,
    };
    timetableState.timetableDataReady = true;
    await act(async () => {
      root.render(createElement(AccountSection));
    });
    const settledRestoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore from backup",
    );
    await act(async () => settledRestoreButton?.click());
    const backupChoice = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("1 semesters · 1 courses"),
    );
    await act(async () => backupChoice?.click());
    timetableState.timetableSyncStatus = {
      uploading: true,
      uploadFailed: false,
      lastSyncedAt: 1,
    };
    await act(async () => {
      root.render(createElement(AccountSection));
    });
    const busyConfirmButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore",
    );
    expect(busyConfirmButton?.disabled).toBe(true);

    timetableState.timetableSyncStatus = {
      uploading: false,
      uploadFailed: false,
      lastSyncedAt: 1,
    };
    await act(async () => {
      root.render(createElement(AccountSection));
    });
    const settledConfirmButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Restore",
    );
    expect(settledConfirmButton?.disabled).toBe(false);
    await act(async () => settledConfirmButton?.click());

    expect(timetableState.courses).toEqual(restoredCourses);
    expect(timetableState.courses).not.toEqual({
      "11410": ["CURRENT-COURSE", "RESTORED-COURSE"],
    });
    await act(async () => root.unmount());
  });

  test("uses the route language and does not invent a sync time", async () => {
    authState.isAuthenticated = true;
    authState.user = user;
    timetableState.timetableDataReady = true;
    timetableState.timetableSyncStatus = {
      uploading: false,
      uploadFailed: false,
      lastSyncedAt: null,
    };
    const first = await renderAccountSection();
    expect(first.container.textContent).toContain("Synced");
    expect(first.container.textContent).not.toContain("Last synced");
    await act(async () => first.root.unmount());

    settingsState.language = "zh";
    timetableState.timetableSyncStatus = {
      uploading: false,
      uploadFailed: false,
      lastSyncedAt: Date.now() - 5 * 60 * 1000,
    };
    const second = await renderAccountSection();
    expect(second.container.textContent).toContain("分鐘前");
    await act(async () => second.root.unmount());

    const chineseSearch = await renderAccountSection(undefined, "登出");
    expect(chineseSearch.container.querySelector("#account")).not.toBeNull();
    expect(
      chineseSearch.container.querySelector("#setting-account"),
    ).not.toBeNull();
    expect(
      chineseSearch.container.querySelector("#setting-account")?.textContent,
    ).toContain("登出");
    expect(
      chineseSearch.container.querySelector("#setting-sync-status"),
    ).toBeNull();
    await act(async () => chineseSearch.root.unmount());

    settingsState.language = "en";
    const syncSearch = await renderAccountSection(undefined, "sync");
    expect(syncSearch.container.querySelector("#account")).not.toBeNull();
    expect(
      syncSearch.container.querySelector("#setting-sync-status"),
    ).not.toBeNull();
    expect(syncSearch.container.querySelector("#setting-account")).toBeNull();
    await act(async () => syncSearch.root.unmount());
  });
});

afterEach(() => {
  activeDom?.window.close();
  activeDom = undefined;
  restoreGlobals();
});

afterAll(() => {
  mock.module("@courseweb/ui", () => actualUi);
  mock.module("react-oidc-context", () => actualOidcContext);
  mock.module("rxdb-hooks", () => actualRxdbHooks);
  mock.module("@/dictionaries/useDictionary", () => actualDictionary);
});
