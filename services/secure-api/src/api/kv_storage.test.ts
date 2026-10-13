import { describe, expect, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import { createKvStorageApp } from "./kv_storage";
import {
  losesSyncedData,
  mergeSyncedValue,
  validKeys,
} from "./kv_storage_contract";

type StoredRecord = Record<string, unknown>;

const createFakeFirestore = (initial: Record<string, StoredRecord> = {}) => {
  const records = new Map(Object.entries(initial));
  const readPaths: string[] = [];
  const writePaths: string[] = [];

  const getRef = (path: string): any => ({
    path,
    doc: (id: string) => getRef(`${path}/${id}`),
    collection: (name: string) => getRef(`${path}/${name}`),
    get: async () => ({
      exists: records.has(path),
      data: () => records.get(path),
    }),
  });

  const adminFirestore = {
    collection: (name: string) => getRef(name),
    runTransaction: async (callback: (transaction: any) => Promise<void>) => {
      const writes: Array<{ path: string; data: StoredRecord }> = [];
      let hasWritten = false;
      await callback({
        get: async (ref: { path: string }) => {
          if (hasWritten) throw new Error("transaction read after write");
          readPaths.push(ref.path);
          return {
            exists: records.has(ref.path),
            data: () => records.get(ref.path),
          };
        },
        set: (ref: { path: string }, data: StoredRecord) => {
          hasWritten = true;
          writePaths.push(ref.path);
          writes.push({ path: ref.path, data });
        },
      });
      for (const write of writes) records.set(write.path, write.data);
    },
  };

  return { adminFirestore, records, readPaths, writePaths };
};

const fakeAuth: MiddlewareHandler<any> = async (c, next) => {
  c.set("user", { userId: "test-user" });
  await next();
};

const noRateLimit: MiddlewareHandler<any> = async (_c, next) => {
  await next();
};

const jsonRequest = (path: string, payload: unknown) =>
  new Request(`http://test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

const createApp = (
  firestore: ReturnType<typeof createFakeFirestore>,
  now = 0,
) =>
  createKvStorageApp({
    auth: fakeAuth,
    rateLimit: noRateLimit,
    getFirebaseAdmin: () =>
      ({ adminFirestore: firestore.adminFirestore }) as any,
    now: () => now,
  });

const postValue = (
  app: ReturnType<typeof createKvStorageApp>,
  key: string,
  value: unknown,
  lastModified: number,
  options: Record<string, unknown> = {},
) =>
  app.request(
    jsonRequest(`/${key}`, {
      value,
      lastModified,
      ...options,
    }),
  );

describe("KV timetable custom-item contract", () => {
  test("allows the custom timetable storage key", () => {
    expect(validKeys).toContain("timetable_custom_items");
  });

  test("allows the self-reported grades storage key", () => {
    expect(validKeys).toContain("grades");
  });

  test("allows the timetable display settings storage key", () => {
    expect(validKeys).toContain("timetable-display-settings");
  });

  test("merges custom items by id and lets incoming edits win", () => {
    expect(
      mergeSyncedValue(
        "timetable_custom_items",
        {
          "11410": [
            { id: "keep", title: "Keep" },
            { id: "edit", title: "Old title" },
          ],
        },
        {
          "11410": [
            { id: "new", title: "New" },
            { id: "edit", title: "New title" },
          ],
        },
      ),
    ).toEqual({
      "11410": [
        { id: "keep", title: "Keep" },
        { id: "edit", title: "New title" },
        { id: "new", title: "New" },
      ],
    });
  });
});

describe("lossy synced data detection", () => {
  test("recurses through nested maps and ID-matched entries", () => {
    expect(
      losesSyncedData(
        { hiddenCourses: { "11410": ["a", "b"] } },
        { hiddenCourses: { "11410": ["a"] } },
      ),
    ).toBe(true);
    expect(
      losesSyncedData(
        {
          grades: {
            entries: [
              { id: "entry-a", score: 90 },
              { id: "entry-b", score: 80 },
            ],
            semesters: [{ id: "fall", courses: ["a"] }],
          },
        },
        {
          grades: {
            entries: [{ id: "entry-a", score: 90 }],
            semesters: [{ id: "fall", courses: ["a"] }],
          },
        },
      ),
    ).toBe(true);
    expect(
      losesSyncedData(
        { grades: { entries: [{ id: "entry-a", courses: ["a", "b"] }] } },
        { grades: { entries: [{ id: "entry-a", courses: ["a"] }] } },
      ),
    ).toBe(true);
  });

  test("detects container type changes and loss in later keys", () => {
    expect(losesSyncedData({ "11410": ["A"] }, null)).toBe(true);
    expect(losesSyncedData({ "11410": ["A"] }, [])).toBe(true);
    expect(losesSyncedData({ "11410": ["A"] }, "x")).toBe(true);
    expect(losesSyncedData(["A"], {})).toBe(true);
    expect(
      losesSyncedData(
        { "11410": ["A"], "11420": ["B"] },
        { "11410": ["A"], "11420": "intact" },
      ),
    ).toBe(true);
    expect(
      losesSyncedData(
        { first: ["A"], later: ["B"] },
        { first: ["A"], later: "damaged" },
      ),
    ).toBe(true);
  });

  test("does not treat preferences, omissions of empty values, or additions as loss", () => {
    expect(losesSyncedData({ theme: "dark" }, { theme: "light" })).toBe(false);
    expect(
      losesSyncedData(
        { empty: [], cleared: null, kept: ["A"] },
        { kept: ["A"] },
      ),
    ).toBe(false);
    expect(
      losesSyncedData(
        { nested: { items: ["A", "B"] } },
        { nested: { items: ["B", "A", "C"] } },
      ),
    ).toBe(false);
    expect(
      losesSyncedData(
        { nested: { value: "same" } },
        { nested: { value: "same" } },
      ),
    ).toBe(false);
  });

  test("does not throw past the recursion depth guard", () => {
    let previous: unknown = { value: "same" };
    let next: unknown = { value: "same" };
    for (let level = 0; level < 50; level += 1) {
      previous = { child: previous };
      next = { child: next };
    }
    expect(() => losesSyncedData(previous, next)).not.toThrow();
    expect(losesSyncedData(previous, next)).toBe(false);
  });

  test("detects removed semesters and entries without treating reorder as loss", () => {
    expect(
      losesSyncedData(
        { "11410": ["A", "B"], "11420": ["C"] },
        { "11410": ["B", "A"] },
      ),
    ).toBe(true);
    expect(
      losesSyncedData({ "11410": ["A", "B"] }, { "11410": ["B", "A"] }),
    ).toBe(false);
    expect(losesSyncedData({ "11410": ["A", "B"] }, { "11410": ["A"] })).toBe(
      true,
    );
  });

  test("compares custom items by id and otherwise by JSON", () => {
    expect(
      losesSyncedData(
        { "11410": [{ id: "a", title: "old" }, { title: "same" }] },
        { "11410": [{ id: "a", title: "new" }, { title: "same" }] },
      ),
    ).toBe(false);
    expect(
      losesSyncedData(
        { "11410": [{ id: "a", title: "old" }] },
        { "11410": [{ id: "b", title: "old" }] },
      ),
    ).toBe(true);
  });

  test("handles favourites, preference objects, and malformed values safely", () => {
    expect(losesSyncedData(["a", "b"], ["b", "a"])).toBe(false);
    expect(losesSyncedData(["a", "b"], ["a"])).toBe(true);
    expect(losesSyncedData({ theme: "dark" }, { theme: "light" })).toBe(false);
    expect(
      losesSyncedData({ theme: "dark", font: 2 }, { theme: "light" }),
    ).toBe(true);
    expect(losesSyncedData("old", { "11410": ["A"] })).toBe(false);
    expect(losesSyncedData({ "11410": [null] }, { "11410": [] })).toBe(true);
  });
});

describe("KV lossy-write backups", () => {
  const previous = {
    value: { "11410": ["A", "B"] },
    lastModified: 10,
    updatedAt: 10,
    deviceId: "old-device",
  };

  test("backs up the previous courses value before a lossy write", async () => {
    const firestore = createFakeFirestore({
      "users/test-user/storage/courses": previous,
    });
    const app = createApp(firestore, Date.parse("2026-10-13T12:00:00.000Z"));

    const response = await postValue(app, "courses", { "11410": ["A"] }, 11, {
      deviceId: "new-device",
    });

    expect(response.status).toBe(200);
    expect(
      firestore.records.get("users/test-user/storage/courses")?.value,
    ).toEqual({
      "11410": ["A"],
    });
    const backup = firestore.records.get(
      "users/test-user/storage_backups/courses__13",
    );
    expect(backup).toMatchObject({
      ...previous,
      day: "2026-10-13",
      replacedAt: Date.parse("2026-10-13T12:00:00.000Z"),
      replacedByDeviceId: "new-device",
    });
    expect((backup?.expireAt as { toMillis: () => number }).toMillis()).toBe(
      Date.parse("2026-10-13T12:00:00.000Z") + 35 * 24 * 60 * 60 * 1000,
    );
    expect(firestore.readPaths).toEqual([
      "users/test-user/storage/courses",
      "users/test-user/storage_backups/courses__13",
    ]);
  });

  test("does not back up additions, reorder, first writes, or identical values", async () => {
    for (const [stored, incoming] of [
      [undefined, { "11410": ["A"] }],
      [{ "11410": ["A"] }, { "11410": ["A", "B"] }],
      [{ "11410": ["A", "B"] }, { "11410": ["B", "A"] }],
      [{ "11410": ["A"] }, { "11410": ["A"] }],
    ] as const) {
      const firestore = createFakeFirestore(
        stored === undefined
          ? {}
          : {
              "users/test-user/storage/courses": {
                value: stored,
                lastModified: 1,
              },
            },
      );
      const app = createApp(firestore, Date.parse("2026-10-13T12:00:00.000Z"));
      await postValue(app, "courses", incoming, 2);
      expect(
        [...firestore.records.keys()].filter((path) =>
          path.includes("storage_backups"),
        ),
      ).toHaveLength(0);
    }
  });

  test("keeps the first lossy backup for a day and reuses the slot later", async () => {
    const firestore = createFakeFirestore({
      "users/test-user/storage/courses": previous,
    });
    const app = createApp(firestore, Date.parse("2026-10-13T12:00:00.000Z"));
    await postValue(app, "courses", { "11410": ["A"] }, 11);
    const firstBackup = firestore.records.get(
      "users/test-user/storage_backups/courses__13",
    );

    await postValue(app, "courses", { "11410": [] }, 12);
    expect(
      firestore.records.get("users/test-user/storage_backups/courses__13"),
    ).toBe(firstBackup);

    await postValue(app, "courses", { "11410": ["A", "B"] }, 12);
    const laterApp = createApp(
      firestore,
      Date.parse("2027-11-13T12:00:00.000Z"),
    );
    await postValue(laterApp, "courses", { "11410": ["C"] }, 13);
    expect(
      firestore.records.get("users/test-user/storage_backups/courses__13"),
    ).toMatchObject({
      value: { "11410": ["A", "B"] },
      day: "2027-11-13",
    });
  });

  test("keeps the first nested-loss predecessor when a later same-day loss is unrelated", async () => {
    const firestore = createFakeFirestore({
      "users/test-user/storage/grades": {
        value: {
          entries: [{ id: "entry-a", courses: ["A", "B", "C"] }],
        },
        lastModified: 10,
      },
    });
    const app = createApp(firestore, Date.parse("2026-10-13T12:00:00.000Z"));

    await postValue(
      app,
      "grades",
      { entries: [{ id: "entry-a", courses: ["A", "B"] }] },
      11,
    );
    await postValue(
      app,
      "grades",
      { entries: [{ id: "entry-a", courses: ["A"] }] },
      12,
    );

    expect(
      firestore.records.get("users/test-user/storage_backups/grades__13")
        ?.value,
    ).toEqual({
      entries: [{ id: "entry-a", courses: ["A", "B", "C"] }],
    });
  });

  test("ignores stale writes without reading or changing a backup", async () => {
    const firestore = createFakeFirestore({
      "users/test-user/storage/courses": previous,
    });
    const app = createApp(firestore, Date.parse("2026-10-13T12:00:00.000Z"));

    const response = await postValue(app, "courses", { "11410": [] }, 9);

    expect(response.status).toBe(200);
    expect(firestore.records.get("users/test-user/storage/courses")).toBe(
      previous,
    );
    expect(firestore.readPaths).toEqual(["users/test-user/storage/courses"]);
    expect(firestore.writePaths).toHaveLength(0);
  });

  test("does not back up a merge union that loses nothing", async () => {
    const firestore = createFakeFirestore({
      "users/test-user/storage/courses": previous,
    });
    const app = createApp(firestore, Date.parse("2026-10-13T12:00:00.000Z"));

    await postValue(app, "courses", { "11410": ["A"] }, 11, { merge: true });

    expect(
      firestore.records.get("users/test-user/storage/courses")?.value,
    ).toEqual({ "11410": ["A", "B"] });
    expect(
      [...firestore.records.keys()].filter((path) =>
        path.includes("storage_backups"),
      ),
    ).toHaveLength(0);
  });

  test("backs up favourites and preference data only when entries or keys are lost", async () => {
    const firestore = createFakeFirestore({
      "users/test-user/storage/course_favourites": {
        value: ["a", "b"],
        lastModified: 1,
      },
      "users/test-user/storage/timetable_theme": {
        value: { theme: "dark", density: "comfortable" },
        lastModified: 1,
      },
    });
    const app = createApp(firestore, Date.parse("2026-10-13T12:00:00.000Z"));

    await postValue(app, "course_favourites", ["b"], 2);
    await postValue(app, "timetable_theme", { theme: "light" }, 2);

    expect(
      firestore.records.has(
        "users/test-user/storage_backups/course_favourites__13",
      ),
    ).toBe(true);
    expect(
      firestore.records.has(
        "users/test-user/storage_backups/timetable_theme__13",
      ),
    ).toBe(true);
  });
});
