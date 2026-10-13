import { describe, expect, test } from "bun:test";
import { Timestamp } from "@google-cloud/firestore";
import type { MiddlewareHandler } from "hono";
import { createReplicationApp } from "./replication";

type StoredRecord = Record<string, any>;

const createFakeFirestore = (initial: Record<string, StoredRecord> = {}) => {
  const records = new Map(Object.entries(initial));

  const fieldName = (field: unknown) =>
    typeof field === "string" ? field : "__name__";
  const compareTimestamp = (left: unknown, right: unknown) => {
    const leftDate = left instanceof Timestamp ? left.toDate().getTime() : 0;
    const rightDate = right instanceof Timestamp ? right.toDate().getTime() : 0;
    return leftDate - rightDate;
  };

  type Filter = { field: string; operator: string; value: unknown };
  type QueryState = {
    path: string;
    filters: Filter[];
    order?: { field: string; direction: string };
    limit?: number;
  };

  const getDocs = (state: QueryState) => {
    let docs = [...records.entries()]
      .filter(([path]) => path.startsWith(`${state.path}/`))
      .map(([path, data]) => ({
        id: path.slice(state.path.length + 1),
        data: () => data,
      }));

    docs = docs.filter((doc) =>
      state.filters.every(({ field, operator, value }) => {
        const actual = field === "__name__" ? doc.id : doc.data()[field];
        if (field === "serverTimestamp") {
          const comparison = compareTimestamp(actual, value);
          if (operator === ">") return comparison > 0;
          if (operator === "==") return comparison === 0;
        }
        if (operator === "in") return (value as string[]).includes(actual);
        if (operator === ">") return actual > value;
        if (operator === "==") return actual === value;
        return false;
      }),
    );

    if (state.order) {
      const { field, direction } = state.order;
      docs.sort((left, right) => {
        const leftValue = field === "__name__" ? left.id : left.data()[field];
        const rightValue =
          field === "__name__" ? right.id : right.data()[field];
        const comparison =
          field === "serverTimestamp"
            ? compareTimestamp(leftValue, rightValue)
            : leftValue < rightValue
              ? -1
              : leftValue > rightValue
                ? 1
                : 0;
        return direction === "desc" ? -comparison : comparison;
      });
    }

    return state.limit === undefined ? docs : docs.slice(0, state.limit);
  };

  const getQuery = (state: QueryState): any => ({
    where: (field: unknown, operator: string, value: unknown) =>
      getQuery({
        ...state,
        filters: [
          ...state.filters,
          { field: fieldName(field), operator, value },
        ],
      }),
    orderBy: (field: unknown, direction: string) =>
      getQuery({ ...state, order: { field: fieldName(field), direction } }),
    limit: (limit: number) => getQuery({ ...state, limit }),
    get: async () => ({ docs: getDocs(state) }),
  });

  const getRef = (path: string): any => ({
    path,
    doc: (id: string) => getRef(`${path}/${id}`),
    collection: (name: string) => getRef(`${path}/${name}`),
    where: (field: unknown, operator: string, value: unknown) =>
      getQuery({
        path,
        filters: [{ field: fieldName(field), operator, value }],
      }),
    orderBy: (field: unknown, direction: string) =>
      getQuery({
        path,
        filters: [],
        order: { field: fieldName(field), direction },
      }),
    get: async () => ({
      exists: records.has(path),
      data: () => records.get(path),
    }),
  });

  const adminFirestore = {
    collection: (name: string) => getRef(name),
    runTransaction: async (callback: (transaction: unknown) => Promise<void>) =>
      callback({}),
    batch: () => {
      const operations: Array<{ path: string; data: StoredRecord }> = [];
      return {
        set: (ref: { path: string }, data: StoredRecord) =>
          operations.push({ path: ref.path, data }),
        update: (ref: { path: string }, data: StoredRecord) =>
          operations.push({ path: ref.path, data }),
        commit: async () => {
          for (const operation of operations) {
            records.set(operation.path, operation.data);
          }
        },
      };
    },
  };

  return { adminFirestore, records };
};

const noRateLimit: MiddlewareHandler<any> = async (_context, next) => {
  await next();
};

const jsonRequest = (path: string, payload: unknown) =>
  new Request(`http://test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

describe("secure-api replication", () => {
  test("returns stale-master conflicts for events and timetable sync without overwriting", async () => {
    const timestamp = Timestamp.fromDate(new Date("2026-10-01T00:00:00.000Z"));
    const fakeFirestore = createFakeFirestore({
      "users/alice/events/event-1": {
        title: "server value",
        _deleted: false,
        serverTimestamp: timestamp,
      },
      "users/alice/timetablesync/11410": {
        lastSync: "2026-10-01T00:00:00.000Z",
        courses: ["SERVER-COURSE"],
        _deleted: false,
        serverTimestamp: timestamp,
      },
    });
    const auth: MiddlewareHandler<any> = async (context, next) => {
      context.set("user", { userId: "alice" });
      await next();
    };
    const app = createReplicationApp({
      auth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => fakeFirestore,
    });

    const eventResponse = await app.request(
      jsonRequest("/events/push", [
        {
          newDocumentState: {
            id: "event-1",
            title: "client value",
            _deleted: false,
          },
          assumedMasterState: {
            id: "event-1",
            title: "old value",
            _deleted: false,
          },
        },
      ]),
    );
    const timetableResponse = await app.request(
      jsonRequest("/timetablesync/push", [
        {
          newDocumentState: {
            semester: "11410",
            lastSync: "2026-10-02T00:00:00.000Z",
            courses: ["CLIENT-COURSE"],
            _deleted: false,
          },
          assumedMasterState: {
            semester: "11410",
            lastSync: "2026-09-30T00:00:00.000Z",
            courses: ["OLD-COURSE"],
            _deleted: false,
          },
        },
      ]),
    );

    expect(eventResponse.status).toBe(200);
    expect(await eventResponse.json()).toEqual([
      { id: "event-1", title: "server value", _deleted: false },
    ]);
    expect(timetableResponse.status).toBe(200);
    expect(await timetableResponse.json()).toEqual([
      {
        semester: "11410",
        lastSync: "2026-10-01T00:00:00.000Z",
        courses: ["SERVER-COURSE"],
        _deleted: false,
      },
    ]);
    expect(fakeFirestore.records.get("users/alice/events/event-1")?.title).toBe(
      "server value",
    );
    expect(
      fakeFirestore.records.get("users/alice/timetablesync/11410")?.courses,
    ).toEqual(["SERVER-COURSE"]);
  });

  test("advances pull checkpoints through same-timestamp documents in id order", async () => {
    const timestamp = Timestamp.fromDate(new Date("2026-10-01T00:00:00.000Z"));
    const later = Timestamp.fromDate(new Date("2026-10-02T00:00:00.000Z"));
    const fakeFirestore = createFakeFirestore({
      "users/alice/events/a": {
        title: "A",
        _deleted: false,
        serverTimestamp: timestamp,
      },
      "users/alice/events/b": {
        title: "B",
        _deleted: false,
        serverTimestamp: timestamp,
      },
      "users/alice/events/c": {
        title: "C",
        _deleted: false,
        serverTimestamp: later,
      },
    });
    const auth: MiddlewareHandler<any> = async (context, next) => {
      context.set("user", { userId: "alice" });
      await next();
    };
    const app = createReplicationApp({
      auth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => fakeFirestore,
    });

    const first = await app.request(
      "http://test/events/pull?id=&serverTimestamp=&batchSize=1",
    );
    const firstBody = await first.json();
    const second = await app.request(
      `http://test/events/pull?id=${firstBody.checkpoint.id}&serverTimestamp=${encodeURIComponent(firstBody.checkpoint.serverTimestamp)}&batchSize=1`,
    );
    const secondBody = await second.json();

    expect(
      firstBody.documents.map((document: { id: string }) => document.id),
    ).toEqual(["a"]);
    expect(
      secondBody.documents.map((document: { id: string }) => document.id),
    ).toEqual(["b"]);
    expect(secondBody.checkpoint).toEqual({
      id: "b",
      serverTimestamp: "2026-10-01T00:00:00.000Z",
    });
  });

  test("scopes reads and writes to the authenticated user's collection", async () => {
    const fakeFirestore = createFakeFirestore();
    let userId = "alice";
    const auth: MiddlewareHandler<any> = async (context, next) => {
      context.set("user", { userId });
      await next();
    };
    const app = createReplicationApp({
      auth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => fakeFirestore,
    });

    await app.request(
      jsonRequest("/events/push", [
        {
          newDocumentState: { id: "private", title: "Alice", _deleted: false },
        },
      ]),
    );
    userId = "bob";
    const bobPull = await app.request(
      "http://test/events/pull?id=&serverTimestamp=&batchSize=10",
    );
    expect((await bobPull.json()).documents).toEqual([]);

    const bobWrite = await app.request(
      jsonRequest("/events/push", [
        { newDocumentState: { id: "private", title: "Bob", _deleted: false } },
      ]),
    );
    expect(bobWrite.status).toBe(200);
    expect(fakeFirestore.records.get("users/alice/events/private")?.title).toBe(
      "Alice",
    );
    expect(fakeFirestore.records.get("users/bob/events/private")?.title).toBe(
      "Bob",
    );
  });
});
