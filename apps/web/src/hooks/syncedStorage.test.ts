import { describe, expect, test } from "bun:test";
import {
  getSyncedStorageKey,
  getSyncedStorageNamespace,
  mergeCourseStorage,
  mergeStringArray,
  migrateLegacySyncedData,
  normalizeCustomTimetableStorage,
  nextUpdatedAt,
  normalizeSyncedData,
  reconcileSyncedData,
} from "./syncedStorage";

describe("synced storage reconciliation", () => {
  test("uses separate subject namespaces and never uploads A to B", () => {
    const accountAKey = getSyncedStorageKey("courses", "account-a");
    const accountBKey = getSyncedStorageKey("courses", "account-b");
    const localRecords = new Map([
      [
        accountAKey,
        normalizeSyncedData({ "11410": ["course-a"] }, "device-a", 100),
      ],
    ]);
    const accountBLocal = localRecords.get(accountBKey) ?? {
      value: {},
      lastModified: -1,
      updatedAt: -1,
      deviceId: "device-b",
    };

    const reconciliation = reconcileSyncedData({
      local: accountBLocal,
      remote: null,
      mergeData: mergeCourseStorage,
      initial: true,
      deviceId: "device-b",
      now: 200,
    });

    expect(getSyncedStorageNamespace("account-a")).not.toBe(
      getSyncedStorageNamespace("account-b"),
    );
    expect(reconciliation.data.value).toEqual({});
    expect(reconciliation.upload).toBeUndefined();
    expect(localRecords.get(accountAKey)?.value).toEqual({
      "11410": ["course-a"],
    });
  });

  test("does not merge A's retained snapshot into B's existing remote data", () => {
    const accountAKey = getSyncedStorageKey("courses", "account-a");
    const accountBKey = getSyncedStorageKey("courses", "account-b");
    const localRecords = new Map([
      [
        accountAKey,
        normalizeSyncedData({ "11410": ["course-a"] }, "device-a", 100),
      ],
    ]);
    const accountBLocal = localRecords.get(accountBKey) ?? {
      value: {},
      lastModified: -1,
      updatedAt: -1,
      deviceId: "device-b",
    };

    const reconciliation = reconcileSyncedData({
      local: accountBLocal,
      remote: normalizeSyncedData({ "11410": ["course-b"] }, "device-b", 150),
      mergeData: mergeCourseStorage,
      initial: true,
      deviceId: "device-b",
      now: 200,
    });

    expect(reconciliation.data.value).toEqual({
      "11410": ["course-b"],
    });
    expect(reconciliation.upload).toBeUndefined();
    expect(localRecords.get(accountAKey)?.value).toEqual({
      "11410": ["course-a"],
    });
  });

  test("keeps anonymous data separate instead of adopting it on sign-in", () => {
    const anonymousKey = getSyncedStorageKey("courses");
    const accountKey = getSyncedStorageKey("courses", "account-b");
    const localRecords = new Map([
      [
        anonymousKey,
        normalizeSyncedData({ "11410": ["anonymous-course"] }, "device-a", 100),
      ],
    ]);
    const accountLocal = localRecords.get(accountKey) ?? {
      value: {},
      lastModified: -1,
      updatedAt: -1,
      deviceId: "device-b",
    };

    const reconciliation = reconcileSyncedData({
      local: accountLocal,
      remote: null,
      mergeData: mergeCourseStorage,
      initial: true,
      deviceId: "device-b",
      now: 200,
    });

    expect(reconciliation.data.value).toEqual({});
    expect(reconciliation.upload).toBeUndefined();
    expect(localRecords.get(anonymousKey)?.value).toEqual({
      "11410": ["anonymous-course"],
    });
  });

  test("migrates a legacy record while retaining its original unscoped copy", () => {
    const legacyRaw = JSON.stringify({
      value: { "11410": ["legacy-course"] },
      lastModified: 123,
    });
    const scopedKey = getSyncedStorageKey("courses");
    const localRecords = new Map([["courses", legacyRaw]]);
    const migrated = migrateLegacySyncedData<Record<string, string[]>>(
      legacyRaw,
      null,
      "device-anonymous",
      999,
    );

    expect(migrated).toEqual({
      value: { "11410": ["legacy-course"] },
      lastModified: 123,
      updatedAt: 123,
      deviceId: "device-anonymous",
    });
    localRecords.set(scopedKey, JSON.stringify(migrated));
    expect(localRecords.get("courses")).toBe(legacyRaw);
    expect(JSON.parse(localRecords.get(scopedKey)!)).toEqual(migrated);
    expect(scopedKey).not.toBe("courses");
  });

  test("unions course ids within each semester without duplicates", () => {
    expect(
      mergeCourseStorage(
        { "11410": ["11410-CS-1", "11410-CS-2"] },
        { "11410": ["11410-CS-2", "11410-MATH-1"], "11320": ["11320-EE-1"] },
      ),
    ).toEqual({
      "11410": ["11410-CS-1", "11410-CS-2", "11410-MATH-1"],
      "11320": ["11320-EE-1"],
    });
  });

  test("unions favourites from two devices", () => {
    expect(
      mergeStringArray(["course-a", "course-b"], ["course-b", "course-c"]),
    ).toEqual(["course-a", "course-b", "course-c"]);
  });

  test("keeps updatedAt monotonic when the wall clock does not advance", () => {
    expect(nextUpdatedAt(100, 100)).toBe(101);
    expect(nextUpdatedAt(100, 99)).toBe(101);
    expect(nextUpdatedAt(100, 101)).toBe(101);
  });

  test("upgrades a legacy wrapper without losing its value or timestamp", () => {
    expect(
      normalizeSyncedData<{ "11410": string[] }>(
        {
          value: { "11410": ["course-a"] },
          lastModified: 123,
        },
        "device-a",
        999,
      ),
    ).toEqual({
      value: { "11410": ["course-a"] },
      lastModified: 123,
      updatedAt: 123,
      deviceId: "device-a",
    });
  });

  test("converts legacy period blocks into clock-time slots", () => {
    expect(
      normalizeCustomTimetableStorage({
        "11410": [
          {
            id: "job",
            title: "Job",
            color: "#123456",
            schedule: ["M1M2", "W3"],
          },
        ],
      }),
    ).toEqual({
      "11410": [
        {
          id: "job",
          title: "Job",
          color: "#123456",
          slots: [
            { day: 0, start: "08:00", end: "09:50" },
            { day: 2, start: "10:10", end: "11:00" },
          ],
        },
      ],
    });
  });

  test("drops malformed legacy records but keeps valid entries", () => {
    expect(
      normalizeCustomTimetableStorage({
        "11410": [
          { id: "bad", title: "Bad", color: "#000", schedule: ["X0"] },
          {
            id: "mixed",
            title: "Mixed",
            color: "#111",
            schedule: ["M1M2X0"],
          },
        ],
      }),
    ).toEqual({
      "11410": [
        {
          id: "mixed",
          title: "Mixed",
          color: "#111",
          slots: [{ day: 0, start: "08:00", end: "09:50" }],
        },
      ],
    });
  });
});
