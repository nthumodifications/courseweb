import { Prisma, type UserStorage } from "@prisma/client";
import { FieldPath, type Firestore } from "firebase-admin/firestore";
import { mergeSyncedValue } from "../api/kv_storage_contract";
import prisma from "../client";

export type UserStorageRecord = {
  value: Prisma.JsonValue;
  lastModified: number;
  updatedAt?: number;
  deviceId?: string;
};

export type UserStorageWrite = {
  value: Prisma.JsonValue;
  lastModified: number;
  updatedAt?: number;
  deviceId?: string;
};

export type UserStorageEntry = {
  key: string;
  record: UserStorageRecord;
};

export type UserStorageMode = "firestore" | "dual" | "postgres";

type ComparableUserStorageRecord = Pick<
  UserStorageRecord,
  "lastModified" | "updatedAt" | "deviceId"
>;

export interface UserStore {
  get(userId: string, key: string): Promise<UserStorageRecord | undefined>;
  list(userId: string): Promise<UserStorageEntry[]>;
  put(
    userId: string,
    key: string,
    record: UserStorageWrite,
    options: { merge: boolean },
  ): Promise<boolean>;
}

type FirestoreProvider = () => Firestore;
type PrismaLike = typeof prisma;

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const recordTimestamp = (record: ComparableUserStorageRecord) =>
  asNumber(record.updatedAt, asNumber(record.lastModified, -1));

/** Returns whether the candidate wins the route's >= LWW comparison. */
export const compareUserStorageRecords = (
  candidate: ComparableUserStorageRecord,
  existing: ComparableUserStorageRecord | undefined,
) => {
  const candidateTimestamp = recordTimestamp(candidate);
  const existingTimestamp = existing ? recordTimestamp(existing) : -1;
  if (candidateTimestamp !== existingTimestamp) {
    return candidateTimestamp > existingTimestamp ? 1 : -1;
  }

  const candidateDeviceId =
    typeof candidate.deviceId === "string" ? candidate.deviceId : "";
  const existingDeviceId = existing && typeof existing.deviceId === "string"
    ? existing.deviceId
    : "";
  if (candidateDeviceId === existingDeviceId) return 0;
  return candidateDeviceId > existingDeviceId ? 1 : -1;
};

export const resolveUserStorageMode = (
  configuredMode = process.env["KV_STORE_MODE"],
): UserStorageMode => {
  const mode = configuredMode;
  if (!mode || mode === "firestore") return "firestore";
  if (mode === "dual" || mode === "postgres") return mode;
  throw new Error(
    `Invalid KV_STORE_MODE=${mode}; expected firestore, dual, or postgres`,
  );
};

const storageRef = (firestore: Firestore, userId: string, key: string) =>
  firestore.collection("users").doc(userId).collection("storage").doc(key);

const recordFromFirestore = (data: unknown): UserStorageRecord | undefined => {
  if (!data || typeof data !== "object") return undefined;
  return data as UserStorageRecord;
};

const recordFromPostgres = (row: UserStorage): UserStorageRecord => ({
  value: row.value,
  lastModified: row.lastModified,
  ...(row.updatedAt !== null ? { updatedAt: row.updatedAt } : {}),
  ...(row.deviceId !== null ? { deviceId: row.deviceId } : {}),
});

const recordFromLockedRow = (
  row:
    | Pick<UserStorage, "value" | "updatedAt" | "lastModified" | "deviceId">
    | undefined,
) =>
  row
    ? {
        value: row.value,
        lastModified: row.lastModified,
        ...(row.updatedAt !== null ? { updatedAt: row.updatedAt } : {}),
        ...(row.deviceId !== null ? { deviceId: row.deviceId } : {}),
      }
    : undefined;

const nextRecord = (
  key: string,
  existing: UserStorageRecord | undefined,
  incoming: UserStorageWrite,
  merge: boolean,
) => {
  const existingUpdatedAt = recordTimestamp(
    existing ?? { lastModified: -1 },
  );
  const existingDeviceId =
    typeof existing?.deviceId === "string" ? existing.deviceId : "";
  const incomingUpdatedAt = incoming.updatedAt ?? incoming.lastModified;
  const incomingIsNewer =
    compareUserStorageRecords(incoming, existing) >= 0;

  if (!merge && existing && !incomingIsNewer) {
    return { write: false, record: existing };
  }

  const nextUpdatedAt = Math.max(existingUpdatedAt, incomingUpdatedAt);
  const nextLastModified = Math.max(
    asNumber(existing?.lastModified, -1),
    incoming.lastModified,
    nextUpdatedAt,
  );
  const nextDeviceId = incomingIsNewer
    ? incoming.deviceId
    : existingDeviceId || undefined;

  return {
    write: true,
    record: {
      value: (merge
        ? mergeSyncedValue(key, existing?.value, incoming.value)
        : incoming.value) as Prisma.JsonValue,
      lastModified: nextLastModified,
      updatedAt: nextUpdatedAt,
      ...(nextDeviceId ? { deviceId: nextDeviceId } : {}),
    } satisfies UserStorageWrite,
  };
};

export class FirestoreUserStore implements UserStore {
  constructor(private readonly getFirestore: FirestoreProvider) {}

  async get(userId: string, key: string) {
    const snapshot = await storageRef(this.getFirestore(), userId, key).get();
    return snapshot.exists ? recordFromFirestore(snapshot.data()) : undefined;
  }

  async list(userId: string) {
    const snapshot = await this.getFirestore()
      .collection("users")
      .doc(userId)
      .collection("storage")
      .get();
    return snapshot.docs.flatMap((doc) => {
      const record = recordFromFirestore(doc.data());
      return record ? [{ key: doc.id, record }] : [];
    });
  }

  async listAllPage(cursor?: string, limit = 500) {
    const pageSize = Math.min(Math.max(Math.floor(limit), 1), 500);
    let query = this.getFirestore()
      .collectionGroup("storage")
      .orderBy(FieldPath.documentId())
      .limit(pageSize);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    const lastDocument = snapshot.docs.at(-1);
    return {
      documents: snapshot.docs.map((doc) => ({
        path: doc.ref.path,
        record: recordFromFirestore(doc.data()),
      })),
      nextCursor:
        snapshot.docs.length === pageSize
          ? lastDocument?.ref.path
          : undefined,
    };
  }

  async put(
    userId: string,
    key: string,
    incoming: UserStorageWrite,
    { merge }: { merge: boolean },
  ) {
    const firestore = this.getFirestore();
    const ref = storageRef(firestore, userId, key);
    return firestore.runTransaction(async (transaction) => {
      const existingSnapshot = await transaction.get(ref);
      const existing = existingSnapshot.exists
        ? recordFromFirestore(existingSnapshot.data())
        : undefined;
      const result = nextRecord(key, existing, incoming, merge);
      if (result.write) transaction.set(ref, result.record);
      return result.write;
    });
  }
}

export class PostgresUserStore implements UserStore {
  constructor(private readonly db: PrismaLike = prisma) {}

  async get(userId: string, key: string) {
    const row = await this.db.userStorage.findUnique({
      where: { userId_key: { userId, key } },
    });
    return row ? recordFromPostgres(row) : undefined;
  }

  async list(userId: string) {
    const rows = await this.db.userStorage.findMany({ where: { userId } });
    return rows.map((row) => ({
      key: row.key,
      record: recordFromPostgres(row),
    }));
  }

  async put(
    userId: string,
    key: string,
    incoming: UserStorageWrite,
    { merge }: { merge: boolean },
  ) {
    return this.db.$transaction(async (transaction) => {
      // A missing row cannot be locked by FOR UPDATE. Serialize the initial
      // insert too, so concurrent first writes use the same LWW calculation.
      await transaction.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}\0${key}`}, 0))`,
      );
      const lockedRows = await transaction.$queryRaw<UserStorage[]>(Prisma.sql`
        SELECT "userId", "key", "value", "updatedAt", "lastModified", "deviceId"
        FROM "user_storage"
        WHERE "userId" = ${userId} AND "key" = ${key}
        FOR UPDATE
      `);
      const existing = recordFromLockedRow(lockedRows[0]);
      const result = nextRecord(key, existing, incoming, merge);
      if (!result.write) return false;

      await transaction.userStorage.upsert({
        where: { userId_key: { userId, key } },
        create: {
          userId,
          key,
          value: result.record.value as
            | Prisma.InputJsonValue
            | Prisma.JsonNullValueInput,
          updatedAt: result.record.updatedAt,
          lastModified: result.record.lastModified,
          deviceId: result.record.deviceId,
        },
        update: {
          value: result.record.value as
            | Prisma.InputJsonValue
            | Prisma.JsonNullValueInput,
          updatedAt: result.record.updatedAt,
          lastModified: result.record.lastModified,
          deviceId: result.record.deviceId,
        },
      });
      return true;
    });
  }
}

export type UserStorageStoreOptions = {
  mode?: UserStorageMode;
  getFirestore: FirestoreProvider;
  prisma?: PrismaLike;
};

export const createUserStorageStore = ({
  mode = resolveUserStorageMode(),
  getFirestore,
  prisma: db = prisma,
}: UserStorageStoreOptions): UserStore => {
  const firestore = new FirestoreUserStore(getFirestore);
  if (mode === "firestore") return firestore;

  const postgres = new PostgresUserStore(db);
  if (mode === "postgres") return postgres;

  return {
    async get(userId, key) {
      const row = await firestore.get(userId, key);
      void shadowCopy(postgres, userId, key, row);
      return row;
    },

    async list(userId) {
      const entries = await firestore.list(userId);
      for (const entry of entries) {
        void shadowCopy(postgres, userId, entry.key, entry.record);
      }
      return entries;
    },

    async put(userId, key, record, options) {
      const written = await firestore.put(userId, key, record, options);
      void shadowCurrentFirestoreRecord(firestore, postgres, userId, key);
      return written;
    },
  };
};

const shadowCopy = async (
  postgres: PostgresUserStore,
  userId: string,
  key: string,
  record: UserStorageRecord | undefined,
) => {
  if (!record) return;
  try {
    await postgres.put(userId, key, record, { merge: false });
  } catch (error) {
    console.error("Postgres KV shadow copy failed in dual mode:", error);
  }
};

const shadowCurrentFirestoreRecord = async (
  firestore: FirestoreUserStore,
  postgres: PostgresUserStore,
  userId: string,
  key: string,
) => {
  try {
    const record = await firestore.get(userId, key);
    await shadowCopy(postgres, userId, key, record);
  } catch (error) {
    console.error("Firestore KV readback failed in dual mode:", error);
  }
};
