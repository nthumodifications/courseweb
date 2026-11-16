import { describe, expect, test } from "bun:test";
import {
  getSyncedStorageBackupKey,
  getSyncedStorageKey,
  getSyncedStorageNamespace,
  mergeCourseStorage,
  mergeStringArray,
  migrateLegacySyncedData,
  normalizeCustomTimetableStorage,
  nextUpdatedAt,
  normalizeSyncedData,
  reconcileSyncedData,
  valuesEqual,
} from "./syncedStorage";
import type { SyncedData } from "./syncedStorage";

const syncedRecord = <T>(
  value: T,
  updatedAt: number,
  deviceId: string,
): SyncedData<T> => ({
  value,
  lastModified: updatedAt,
  updatedAt,
  deviceId,
});

const accountCourseRecords = () => {
  const accountAKey = getSyncedStorageKey("courses", "account-a");
  const accountBKey = getSyncedStorageKey("courses", "account-b");
  const localRecords = new Map([
    [accountAKey, syncedRecord({ "11410": ["course-a"] }, 100, "device-a")],
  ]);
  return { accountAKey, accountBKey, localRecords };
};

const emptySyncedRecord = (deviceId: string) => syncedRecord({}, -1, deviceId);

type CourseMergeCase = {
  name: string;
  local: SyncedData<Record<string, string[]>>;
  remote: SyncedData<Record<string, string[]>> | null;
  initial: boolean;
  remoteReadSuccessful?: boolean;
  expected: Record<string, string[]>;
  persistLocal: boolean;
  upload?: { merge: boolean };
  backupLocal?: boolean;
};

const courseMergeCases: CourseMergeCase[] = [
  {
    name: "local non-empty and older than an empty remote",
    local: syncedRecord({ "11410": ["local-course"] }, 100, "device-a"),
    remote: syncedRecord({}, 200, "device-b"),
    initial: true,
    expected: {},
    persistLocal: true,
    backupLocal: true,
  },
  {
    name: "local non-empty and newer than an empty remote",
    local: syncedRecord({ "11410": ["local-course"] }, 300, "device-a"),
    remote: syncedRecord({}, 200, "device-b"),
    initial: true,
    expected: { "11410": ["local-course"] },
    persistLocal: false,
    upload: { merge: false },
  },
  {
    name: "local empty and newer than remote non-empty",
    local: syncedRecord({}, 200, "device-a"),
    remote: syncedRecord({ "11410": ["remote-course"] }, 100, "device-b"),
    initial: true,
    expected: {},
    persistLocal: false,
    upload: { merge: false },
  },
  {
    name: "both non-empty and different",
    local: syncedRecord({ "11410": ["local-course"] }, 100, "device-a"),
    remote: syncedRecord({ "11410": ["remote-course"] }, 200, "device-b"),
    initial: true,
    expected: { "11410": ["local-course", "remote-course"] },
    persistLocal: true,
    upload: { merge: true },
  },
  {
    name: "remote read fails",
    local: syncedRecord({ "11410": ["local-course"] }, 100, "device-a"),
    remote: null,
    initial: true,
    remoteReadSuccessful: false,
    expected: { "11410": ["local-course"] },
    persistLocal: false,
  },
  {
    name: "local deletion after the first sync",
    local: syncedRecord({}, 300, "device-a"),
    remote: syncedRecord({ "11410": ["remote-course"] }, 200, "device-b"),
    initial: false,
    expected: {},
    persistLocal: false,
    upload: { merge: false },
  },
];

const expectMergedClear = (
  reconciliation: ReturnType<typeof reconcileSyncedData>,
  persistLocal: boolean,
) => {
  expect(reconciliation.data.value).toEqual({});
  expect(reconciliation.persistLocal).toBe(persistLocal);
  expect(reconciliation.upload).toEqual({ merge: false });
};

describe("synced storage value equality", () => {
  test("ignores object key order at every nesting level", () => {
    expect(
      valuesEqual(
        {
          course_color_map: {
            "course-a": "#123456",
            "course-b": "#654321",
          },
          preferences: {
            visible: ["course-a", "course-b"],
            options: { compact: true, showNames: false },
          },
        },
        {
          preferences: {
            options: { showNames: false, compact: true },
            visible: ["course-a", "course-b"],
          },
          course_color_map: {
            "course-b": "#654321",
            "course-a": "#123456",
          },
        },
      ),
    ).toBe(true);
  });

  test("keeps array order significant", () => {
    expect(
      valuesEqual(["course-a", "course-b"], ["course-b", "course-a"]),
    ).toBe(false);
  });

  test("matches JSON.stringify handling of undefined object keys", () => {
    expect(valuesEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(valuesEqual({ a: 1, b: undefined }, { a: 1, b: null })).toBe(false);
  });

  test("handles JSON values, numbers, and dates", () => {
    expect(valuesEqual(null, null)).toBe(true);
    expect(valuesEqual(null, undefined)).toBe(false);
    expect(valuesEqual(1, 1)).toBe(true);
    expect(valuesEqual(1, "1")).toBe(false);
    expect(valuesEqual(new Date("2026-01-01"), new Date("2026-01-01"))).toBe(
      true,
    );
    expect(valuesEqual(new Date("2026-01-01"), new Date("2026-01-02"))).toBe(
      false,
    );
    expect(
      valuesEqual(new Date("2026-01-01"), "2026-01-01T00:00:00.000Z"),
    ).toBe(true);
    expect(valuesEqual(new Date("not-a-date"), null)).toBe(true);
  });

  test("handles an own __proto__ key", () => {
    const left = JSON.parse('{"__proto__":{"value":1}}');
    const right = Object.create(null) as Record<string, unknown>;
    right["__proto__"] = { value: 1 };

    expect(valuesEqual(left, right)).toBe(true);
    expect(valuesEqual(left, { __proto__: { value: 1 } })).toBe(false);
  });

  test("compares a large object efficiently", () => {
    const left: Record<string, number> = {};
    const right: Record<string, number> = {};
    for (let index = 0; index < 5_000; index += 1) {
      left[`key-${index}`] = index;
      right[`key-${index}`] = index;
    }

    const started = performance.now();
    expect(valuesEqual(left, right)).toBe(true);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

describe("synced storage reconciliation", () => {
  test.each(courseMergeCases)("sign-in merge: $name", (scenario) => {
    const reconciliation = reconcileSyncedData({
      local: scenario.local,
      remote: scenario.remote,
      mergeData: mergeCourseStorage,
      initial: scenario.initial,
      deviceId: "device-a",
      remoteReadSuccessful: scenario.remoteReadSuccessful,
      now: 1000,
    });

    expect(reconciliation.data.value).toEqual(scenario.expected);
    expect(reconciliation.persistLocal).toBe(scenario.persistLocal);
    expect(reconciliation.upload).toEqual(scenario.upload);
    expect(reconciliation.backupLocal).toBe(scenario.backupLocal);
  });

  test("takes remote data over an uninitialized local snapshot", () => {
    const reconciliation = reconcileSyncedData({
      local: emptySyncedRecord("device-a"),
      remote: syncedRecord({ "11410": ["course-a"] }, 100, "device-b"),
      initial: true,
      deviceId: "device-a",
      now: 1000,
    });

    expect(reconciliation.data.value).toEqual({ "11410": ["course-a"] });
    expect(reconciliation.upload).toBeUndefined();
  });

  test("keeps an initialized local clear when it is newer", () => {
    const reconciliation = reconcileSyncedData({
      local: syncedRecord({}, 200, "device-a"),
      remote: syncedRecord({ "11410": ["course-a"] }, 100, "device-b"),
      mergeData: mergeCourseStorage,
      initial: true,
      deviceId: "device-a",
    });

    expectMergedClear(reconciliation, false);
  });

  test("honors a newer remote clear and backs up stale local data", () => {
    const reconciliation = reconcileSyncedData({
      local: syncedRecord({ "11410": ["course-a"] }, 100, "device-a"),
      remote: syncedRecord({}, 200, "device-b"),
      mergeData: mergeCourseStorage,
      initial: true,
      deviceId: "device-a",
    });

    expect(reconciliation.data.value).toEqual({});
    expect(reconciliation.persistLocal).toBe(true);
    expect(reconciliation.upload).toBeUndefined();
    expect(reconciliation.backupLocal).toBe(true);
  });

  test("propagates a newer local clear after the first sync", () => {
    const reconciliation = reconcileSyncedData({
      local: syncedRecord({}, 200, "device-a"),
      remote: syncedRecord({ "11410": ["course-a"] }, 100, "device-b"),
      mergeData: mergeCourseStorage,
      initial: false,
      deviceId: "device-a",
    });

    expectMergedClear(reconciliation, false);
  });

  test("keeps and uploads non-empty local data when remote is uninitialized", () => {
    for (const remote of [null, emptySyncedRecord("device-b")]) {
      const reconciliation = reconcileSyncedData({
        local: syncedRecord({ theme: "local" }, 100, "device-a"),
        remote,
        initial: true,
        deviceId: "device-a",
      });

      expect(reconciliation.data.value).toEqual({ theme: "local" });
      expect(reconciliation.upload).toEqual({ merge: false });
    }
  });

  test("does not reconcile or upload after an unsuccessful remote read", () => {
    const local = syncedRecord({ theme: "local" }, 100, "device-a");
    const reconciliation = reconcileSyncedData({
      local,
      remote: null,
      remoteReadSuccessful: false,
      initial: true,
      deviceId: "device-a",
      now: 1000,
    });

    expect(reconciliation.data).toEqual(local);
    expect(reconciliation.persistLocal).toBe(false);
    expect(reconciliation.upload).toBeUndefined();
  });

  test("marks a replaced non-empty local snapshot for one scoped backup", () => {
    const reconciliation = reconcileSyncedData({
      local: syncedRecord({ theme: "local" }, 100, "device-a"),
      remote: syncedRecord({ theme: "remote" }, 200, "device-b"),
      initial: false,
      deviceId: "device-a",
    });

    expect(reconciliation.data.value).toEqual({ theme: "remote" });
    expect(reconciliation.backupLocal).toBe(true);
    expect(getSyncedStorageBackupKey("nthumods-storage-user-theme")).toBe(
      "nthumods-storage-user-theme__backup",
    );
  });

  test("does not persist or upload an equal snapshot on initial reconciliation", () => {
    const local = syncedRecord(["course-a"], 200, "device-a");
    const reconciliation = reconcileSyncedData({
      local,
      remote: syncedRecord(["course-a"], 100, "device-b"),
      mergeData: (left, right) => [...new Set([...left, ...right])],
      initial: true,
      deviceId: "device-a",
    });

    expect(reconciliation.persistLocal).toBe(false);
    expect(reconciliation.upload).toBeUndefined();
  });

  test("does not reconcile a Firestore value reordered by Postgres jsonb", () => {
    const firestoreValue = {
      course_color_map: {
        "course-a": "#123456",
        "course-b": "#654321",
      },
      timetable_display_preferences: {
        englishNames: "add",
        showCredits: true,
      },
    };
    const postgresValue = {
      timetable_display_preferences: {
        showCredits: true,
        englishNames: "add",
      },
      course_color_map: {
        "course-b": "#654321",
        "course-a": "#123456",
      },
    };

    const reconciliation = reconcileSyncedData({
      local: syncedRecord(firestoreValue, 100, "firestore-device"),
      remote: syncedRecord(postgresValue, 100, "firestore-device"),
      mergeData: (local) => local,
      initial: true,
      deviceId: "web-device",
    });

    expect(reconciliation.data.value).toEqual(postgresValue);
    expect(reconciliation.persistLocal).toBe(false);
    expect(reconciliation.backupLocal).toBeUndefined();
    expect(reconciliation.upload).toBeUndefined();
  });

  test("keeps account namespaces isolated across sign-out and account switch", () => {
    const { accountAKey, accountBKey, localRecords } = accountCourseRecords();

    const accountB = reconcileSyncedData({
      local: localRecords.get(accountBKey) ?? emptySyncedRecord("device-b"),
      remote: null,
      mergeData: mergeCourseStorage,
      initial: true,
      deviceId: "device-b",
      now: 200,
    });

    expect(accountB.data.value).toEqual({});
    expect(accountB.upload).toBeUndefined();
    expect(localRecords.has(accountBKey)).toBe(false);
    expect(localRecords.get(accountAKey)?.value).toEqual({
      "11410": ["course-a"],
    });
  });

  test("uses separate subject namespaces and never uploads A to B", () => {
    const { accountAKey, accountBKey, localRecords } = accountCourseRecords();
    const accountBLocal =
      localRecords.get(accountBKey) ?? emptySyncedRecord("device-b");

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
    const { accountAKey, accountBKey, localRecords } = accountCourseRecords();
    const accountBLocal =
      localRecords.get(accountBKey) ?? emptySyncedRecord("device-b");

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
        syncedRecord({ "11410": ["anonymous-course"] }, 100, "device-a"),
      ],
    ]);
    const accountLocal =
      localRecords.get(accountKey) ?? emptySyncedRecord("device-b");

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
