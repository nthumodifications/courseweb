import { describe, expect, test } from "bun:test";
import {
  createUserStorageStore,
  FirestoreUserStore,
  PostgresUserStore,
  resolveUserStorageMode,
} from "./userStore";

type Stored = {
  value: unknown;
  lastModified: number;
  updatedAt?: number | null;
  deviceId?: string | null;
};

const createFirestoreFake = () => {
  const records = new Map<string, Stored>();
  const ref = (path: string): any => ({
    path,
    doc: (id: string) => ref(`${path}/${id}`),
    collection: (name: string) => ref(`${path}/${name}`),
    get: async () => ({
      exists: records.has(path),
      data: () => records.get(path),
      docs: [...records.entries()]
        .filter(([recordPath]) => recordPath.startsWith(`${path}/`))
        .map(([recordPath, data]) => ({
          id: recordPath.slice(path.length + 1),
          data: () => data,
        })),
    }),
  });

  return {
    records,
    adminFirestore: {
      collection: (name: string) => ref(name),
      runTransaction: async (callback: (transaction: any) => unknown) =>
        callback({
          get: (storageRef: any) => storageRef.get(),
          set: (storageRef: any, data: Stored) =>
            records.set(storageRef.path, data),
        }),
    } as any,
  };
};

const createPrismaFake = () => {
  const records = new Map<string, any>();
  const id = (userId: string, key: string) => `${userId}\0${key}`;
  const userStorage = {
    findUnique: async ({ where }: any) =>
      records.get(id(where.userId_key.userId, where.userId_key.key)) ?? null,
    findMany: async ({ where }: any) =>
      [...records.values()].filter((record) => record.userId === where.userId),
    upsert: async ({ where, create, update }: any) => {
      const recordId = id(where.userId_key.userId, where.userId_key.key);
      const next = records.has(recordId)
        ? { ...records.get(recordId), ...update }
        : create;
      records.set(recordId, next);
      return next;
    },
  };
  const db: any = {
    userStorage,
    $transaction: async (callback: (transaction: any) => unknown) =>
      callback({
        userStorage,
        $executeRaw: async () => undefined,
        $queryRaw: async (query: any) => {
          const values = query.values as string[];
          const record = records.get(id(values[0]!, values[1]!));
          return record ? [record] : [];
        },
      }),
  };
  return { db, records };
};

const makeRecord = (value: unknown, updatedAt: number, deviceId = "device-a") =>
  ({ value, lastModified: updatedAt, updatedAt, deviceId }) as const;

const settleBackgroundWrites = async () => {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
};

const implementations = [
  {
    name: "Firestore",
    create: (firestore: any, _postgres: any) =>
      new FirestoreUserStore(() => firestore),
  },
  {
    name: "Postgres",
    create: (_firestore: any, postgres: any) => new PostgresUserStore(postgres),
  },
];

describe("user storage implementations", () => {
  for (const implementation of implementations) {
    describe(implementation.name, () => {
      test("rejects an older non-merge write", async () => {
        const firestore = createFirestoreFake();
        const postgres = createPrismaFake();
        const store = implementation.create(
          firestore.adminFirestore,
          postgres.db,
        );

        expect(
          await store.put(
            "user-1",
            "courses",
            makeRecord({ first: true }, 10),
            {
              merge: false,
            },
          ),
        ).toBe(true);
        expect(
          await store.put("user-1", "courses", makeRecord({ older: true }, 9), {
            merge: false,
          }),
        ).toBe(false);
        expect(await store.get("user-1", "courses")).toMatchObject({
          value: { first: true },
          updatedAt: 10,
        });
      });

      test("preserves merge and replacement semantics", async () => {
        const firestore = createFirestoreFake();
        const postgres = createPrismaFake();
        const store = implementation.create(
          firestore.adminFirestore,
          postgres.db,
        );

        await store.put(
          "user-1",
          "courses",
          makeRecord({ "11410": ["keep"] }, 10),
          { merge: false },
        );
        await store.put(
          "user-1",
          "courses",
          makeRecord({ "11410": ["incoming"] }, 9),
          { merge: true },
        );
        expect((await store.get("user-1", "courses"))?.value).toEqual({
          "11410": ["keep", "incoming"],
        });

        await store.put("user-1", "courses", makeRecord({}, 11), {
          merge: false,
        });
        expect((await store.get("user-1", "courses"))?.value).toEqual({});
      });
    });
  }
});

describe("user storage mode switch", () => {
  test.each([undefined, ""])(
    "treats an unset or empty mode as Firestore (%s)", (mode) => {
      expect(resolveUserStorageMode(mode)).toBe("firestore");
    },
  );

  test("dual mode reads Firestore and lazily copies the record", async () => {
    const firestore = createFirestoreFake();
    const postgres = createPrismaFake();
    firestore.records.set(
      "users/user-1/storage/courses",
      makeRecord({ ok: true }, 10),
    );
    const store = createUserStorageStore({
      mode: "dual",
      getFirestore: () => firestore.adminFirestore,
      prisma: postgres.db,
    });

    expect(await store.get("user-1", "courses")).toMatchObject({
      value: { ok: true },
    });
    await settleBackgroundWrites();
    expect(
      await new PostgresUserStore(postgres.db).get("user-1", "courses"),
    ).toMatchObject({ value: { ok: true } });
  });

  test("dual GET uses newer Firestore and repairs an existing Postgres row", async () => {
    const firestore = createFirestoreFake();
    const postgres = createPrismaFake();
    firestore.records.set(
      "users/user-1/storage/courses",
      makeRecord({ source: "firestore-new" }, 20, "f"),
    );
    postgres.records.set("user-1\0courses", {
      userId: "user-1",
      key: "courses",
      ...makeRecord({ source: "postgres-old" }, 10, "p"),
    });
    const store = createUserStorageStore({
      mode: "dual",
      getFirestore: () => firestore.adminFirestore,
      prisma: postgres.db,
    });

    expect(await store.get("user-1", "courses")).toMatchObject({
      value: { source: "firestore-new" },
    });
    await settleBackgroundWrites();
    expect(
      await new PostgresUserStore(postgres.db).get("user-1", "courses"),
    ).toMatchObject({
      value: { source: "firestore-new" },
      updatedAt: 20,
      deviceId: "f",
    });
  });

  test("dual POST shadows the Firestore winner after a rejected write", async () => {
    const firestore = createFirestoreFake();
    const postgres = createPrismaFake();
    firestore.records.set(
      "users/user-1/storage/courses",
      makeRecord({ source: "firestore-new" }, 20, "f"),
    );
    postgres.records.set("user-1\0courses", {
      userId: "user-1",
      key: "courses",
      ...makeRecord({ source: "postgres-old" }, 10, "p"),
    });
    const store = createUserStorageStore({
      mode: "dual",
      getFirestore: () => firestore.adminFirestore,
      prisma: postgres.db,
    });

    await expect(
      store.put(
        "user-1",
        "courses",
        makeRecord({ source: "incoming-15" }, 15, "incoming"),
        { merge: false },
      ),
    ).resolves.toBe(false);
    await settleBackgroundWrites();

    expect(firestore.records.get("users/user-1/storage/courses")).toMatchObject(
      {
        value: { source: "firestore-new" },
        updatedAt: 20,
      },
    );
    expect(
      await new PostgresUserStore(postgres.db).get("user-1", "courses"),
    ).toMatchObject({
      value: { source: "firestore-new" },
      updatedAt: 20,
      deviceId: "f",
    });
  });

  test("dual mode Postgres failures do not fail reads or writes", async () => {
    const firestore = createFirestoreFake();
    firestore.records.set(
      "users/user-1/storage/courses",
      makeRecord({ old: true }, 10),
    );
    const brokenPrisma: any = {
      userStorage: {
        findUnique: async () => {
          throw new Error("postgres unavailable");
        },
        findMany: async () => {
          throw new Error("postgres unavailable");
        },
      },
      $transaction: async () => {
        throw new Error("postgres unavailable");
      },
    };
    const store = createUserStorageStore({
      mode: "dual",
      getFirestore: () => firestore.adminFirestore,
      prisma: brokenPrisma,
    });

    expect(await store.get("user-1", "courses")).toMatchObject({
      value: { old: true },
    });
    await expect(
      store.put("user-1", "courses", makeRecord({ new: true }, 11), {
        merge: false,
      }),
    ).resolves.toBe(true);
    expect(
      firestore.records.get("users/user-1/storage/courses")?.value,
    ).toEqual({
      new: true,
    });
  });

  test("unset mode uses Firestore and does not touch Postgres", async () => {
    const previous = process.env["KV_STORE_MODE"];
    delete process.env["KV_STORE_MODE"];
    const firestore = createFirestoreFake();
    const store = createUserStorageStore({
      getFirestore: () => firestore.adminFirestore,
      prisma: {
        userStorage: {
          findUnique: async () => {
            throw new Error("Postgres should not be called");
          },
        },
      } as any,
    });

    await store.put("user-1", "courses", makeRecord({ unchanged: true }, 1), {
      merge: false,
    });
    expect(await store.get("user-1", "courses")).toMatchObject({
      value: { unchanged: true },
    });
    if (previous === undefined) delete process.env["KV_STORE_MODE"];
    else process.env["KV_STORE_MODE"] = previous;
  });
});
