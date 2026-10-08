import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { createUserRateLimiter } from "../middleware/userRateLimit";
import {
  MAX_JSON_DEPTH,
  MAX_JSON_VALUE_BYTES,
  MAX_REQUEST_BODY_BYTES,
  MAX_REPLICATION_BATCH_SIZE,
  MAX_REPLICATION_DOCUMENT_BYTES,
  MAX_REPLICATION_PUSH_DOCUMENTS,
} from "../utils/payload_limits";

type StoredRecord = Record<string, unknown>;

const createFakeFirestore = () => {
  const records = new Map<string, StoredRecord>();

  const getRef = (path: string): any => ({
    path,
    doc: (id: string) => getRef(`${path}/${id}`),
    collection: (name: string) => getRef(`${path}/${name}`),
    get: async () => ({
      exists: records.has(path),
      data: () => records.get(path),
    }),
    where: () => getQuery(path),
    orderBy: () => getQuery(path),
    limit: () => getQuery(path),
  });

  const getQuery = (path: string): any => ({
    where: () => getQuery(path),
    orderBy: () => getQuery(path),
    limit: () => getQuery(path),
    get: async () => ({
      docs: [...records.entries()]
        .filter(([recordPath]) => recordPath.startsWith(`${path}/`))
        .map(([recordPath, data]) => ({
          id: recordPath.slice(path.length + 1),
          data: () => data,
        })),
    }),
  });

  const adminFirestore = {
    collection: (name: string) => getRef(name),
    runTransaction: async (callback: (transaction: any) => Promise<void>) => {
      await callback({
        get: async (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (ref: { path: string }, data: StoredRecord) => {
          records.set(ref.path, data);
        },
        update: (ref: { path: string }, data: StoredRecord) => {
          records.set(ref.path, data);
        },
      });
    },
    batch: () => {
      const operations: Array<{
        type: "set" | "update";
        ref: { path: string };
        data: StoredRecord;
      }> = [];
      return {
        set: (ref: { path: string }, data: StoredRecord) =>
          operations.push({ type: "set", ref, data }),
        update: (ref: { path: string }, data: StoredRecord) =>
          operations.push({ type: "update", ref, data }),
        commit: async () => {
          for (const operation of operations) {
            records.set(operation.ref.path, operation.data);
          }
        },
      };
    },
  };

  return { adminFirestore, records };
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

const nestedValue = () => {
  let value: Record<string, unknown> = { leaf: true };
  for (let depth = 0; depth <= MAX_JSON_DEPTH; depth += 1) {
    value = { nested: value };
  }
  return value;
};

const withoutServerTimestamp = (value: StoredRecord) => {
  const { serverTimestamp: _serverTimestamp, ...rest } = value;
  return rest;
};

describe("secure-api payload limits", () => {
  test("rejects a request body over the Hono body limit with a 413 code", async () => {
    const { createKvStorageApp } = await import("./kv_storage");
    const app = createKvStorageApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => createFakeFirestore(),
    });

    const oversizedBody = JSON.stringify({
      value: "x".repeat(MAX_REQUEST_BODY_BYTES),
      lastModified: 1,
    });
    const response = await app.request(
      new Request("http://test/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(
            new TextEncoder().encode(oversizedBody).byteLength,
          ),
        },
        body: oversizedBody,
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "payload_too_large" });
  });

  test("rejects an oversized KV value and a value that is too deeply nested", async () => {
    const { createKvStorageApp } = await import("./kv_storage");
    const app = createKvStorageApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => createFakeFirestore(),
    });

    const oversizedResponse = await app.request(
      jsonRequest("/courses", {
        value: "x".repeat(MAX_JSON_VALUE_BYTES),
        lastModified: 1,
      }),
    );
    expect(oversizedResponse.status).toBe(400);
    expect(await oversizedResponse.json()).toEqual({
      error: "value_too_large",
    });

    const deepResponse = await app.request(
      jsonRequest("/courses", {
        value: nestedValue(),
        lastModified: 1,
      }),
    );
    expect(deepResponse.status).toBe(400);
    expect(await deepResponse.json()).toEqual({ error: "value_too_deep" });

    const missingValueResponse = await app.request(
      jsonRequest("/courses", { lastModified: 1 }),
    );
    expect(missingValueResponse.status).toBe(400);
  });

  test("keeps a maximum-size KV value unchanged", async () => {
    const fakeFirestore = createFakeFirestore();
    const { createKvStorageApp } = await import("./kv_storage");
    const app = createKvStorageApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => fakeFirestore,
    });
    const value = {
      courses: {
        "11410": ["CS1001", "CS1002"],
      },
      unknownFields: {
        nested: [{ keep: true }, "unchanged"],
      },
      largeLegitimateNote: "client note ".repeat(40_000),
    };

    const response = await app.request(
      jsonRequest("/courses", { value, lastModified: 1 }),
    );

    expect(response.status).toBe(200);
    const stored = fakeFirestore.records.get("users/test-user/storage/courses");
    expect(stored?.value).toEqual(value);
  });

  test("enforces KV key syntax and the real web allowlist", async () => {
    const { createKvStorageApp } = await import("./kv_storage");
    const app = createKvStorageApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => createFakeFirestore(),
    });

    const malformed = await app.request(
      jsonRequest("/bad%20key", { value: true, lastModified: 1 }),
    );
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "invalid_key" });

    const unknown = await app.request(
      jsonRequest("/not_a_web_key", { value: true, lastModified: 1 }),
    );
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual({ error: "invalid_key" });
  });

  test("accepts batchSize 1 and the RxDB default 100, but rejects 0 and 101", async () => {
    const { createReplicationApp } = await import("./replication");
    const app = createReplicationApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => createFakeFirestore(),
    });
    const request = (batchSize: number) =>
      app.request(
        `http://test/events/pull?id=&serverTimestamp=&batchSize=${batchSize}`,
      );

    expect((await request(1)).status).toBe(200);
    expect((await request(MAX_REPLICATION_BATCH_SIZE)).status).toBe(200);
    for (const invalidBatchSize of [0, 101]) {
      const response = await request(invalidBatchSize);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_batch_size" });
    }
  });

  test("accepts realistic large event and timetable documents unchanged", async () => {
    const fakeFirestore = createFakeFirestore();
    const { createReplicationApp } = await import("./replication");
    const app = createReplicationApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => fakeFirestore,
    });
    const event = {
      id: "event-" + "x".repeat(94),
      title: "A long but valid calendar event",
      details: "User-authored details ".repeat(3_000),
      location: "Engineering Building Room 301",
      allDay: false,
      start: "2026-10-08T09:00:00.000Z",
      end: "2026-10-08T10:00:00.000Z",
      repeat: null,
      color: "#4285F4",
      tag: "lecture",
      excludedDates: ["2026-10-15T09:00:00.000Z"],
      parentId: "",
      unknownFields: { preserve: [true, { source: "client" }] },
      _deleted: false,
    };
    const timetable = {
      semester: "11410",
      lastSync: "2026-10-08T09:00:00.000Z",
      courses: Array.from({ length: 50 }, (_, index) => `COURSE-${index}`),
      unknownFields: {
        preserve: {
          source: "client",
          notes: "timetable metadata ".repeat(500),
        },
      },
      _deleted: false,
    };

    expect(JSON.stringify(event).length).toBeLessThan(
      MAX_REPLICATION_DOCUMENT_BYTES,
    );
    expect(JSON.stringify(timetable).length).toBeLessThan(
      MAX_REPLICATION_DOCUMENT_BYTES,
    );

    const eventResponse = await app.request(
      jsonRequest("/events/push", [{ newDocumentState: event }]),
    );
    const timetableResponse = await app.request(
      jsonRequest("/timetablesync/push", [{ newDocumentState: timetable }]),
    );

    expect(eventResponse.status).toBe(200);
    expect(timetableResponse.status).toBe(200);
    const { id: _eventId, ...eventData } = event;
    const { semester: _semester, ...timetableData } = timetable;
    expect(
      withoutServerTimestamp(
        fakeFirestore.records.get("users/test-user/events/" + event.id)!,
      ),
    ).toEqual(eventData);
    expect(
      withoutServerTimestamp(
        fakeFirestore.records.get(
          "users/test-user/timetablesync/" + timetable.semester,
        )!,
      ),
    ).toEqual(timetableData);
  });

  test("rejects hostile, empty, and over-long replication document ids", async () => {
    const { createReplicationApp } = await import("./replication");
    const app = createReplicationApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => createFakeFirestore(),
    });
    const hostileIds = [
      "",
      ".",
      "..",
      "__name__",
      "../other-user",
      "events/other",
      "x".repeat(101),
    ];

    for (const id of hostileIds) {
      const response = await app.request(
        jsonRequest("/events/push", [
          { newDocumentState: { id, _deleted: false } },
        ]),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_document_id" });
    }

    // Ids Firestore accepts must keep syncing, however unusual they look.
    for (const id of [
      "a..b",
      "a\b",
      "course:11510CS 135500:1",
      "x".repeat(100),
    ]) {
      const response = await app.request(
        jsonRequest("/events/push", [
          { newDocumentState: { id, _deleted: false } },
        ]),
      );
      expect(response.status).toBe(200);
    }

    const timetableResponse = await app.request(
      jsonRequest("/timetablesync/push", [
        { newDocumentState: { semester: "114100", _deleted: false } },
      ]),
    );
    expect(timetableResponse.status).toBe(400);
    expect(await timetableResponse.json()).toEqual({
      error: "invalid_document_id",
    });
  });

  test("rejects oversized and too-deep replication documents", async () => {
    const { createReplicationApp } = await import("./replication");
    const app = createReplicationApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => createFakeFirestore(),
    });

    const oversized = await app.request(
      jsonRequest("/events/push", [
        {
          newDocumentState: {
            id: "large-event",
            _deleted: false,
            details: "x".repeat(MAX_REPLICATION_DOCUMENT_BYTES),
          },
        },
      ]),
    );
    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toEqual({
      error: "document_too_large",
    });

    const tooDeep = await app.request(
      jsonRequest("/events/push", [
        {
          newDocumentState: {
            id: "deep-event",
            _deleted: false,
            nested: nestedValue(),
          },
        },
      ]),
    );
    expect(tooDeep.status).toBe(400);
    expect(await tooDeep.json()).toEqual({ error: "document_too_deep" });
  });

  test("allows an initial-sync burst and blocks a flood with Retry-After", async () => {
    let now = 0;
    const limiter = createUserRateLimiter({
      capacity: 60,
      refillPerSecond: 1,
      now: () => now,
    });
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("user", { userId: "sync-user" });
      await next();
    });
    app.get("/", limiter.middleware, (c) => c.json({ ok: true }));

    for (let requestNumber = 0; requestNumber < 60; requestNumber += 1) {
      expect((await app.request("http://test/")).status).toBe(200);
    }

    const blocked = await app.request("http://test/");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("1");
    expect(await blocked.json()).toEqual({ error: "rate_limited" });

    now = 1_000;
    expect((await app.request("http://test/")).status).toBe(200);
  });

  test("caps push arrays at the RxDB default batch size", async () => {
    const { createReplicationApp } = await import("./replication");
    const app = createReplicationApp({
      auth: fakeAuth,
      rateLimit: noRateLimit,
      getFirebaseAdmin: () => createFakeFirestore(),
    });
    const rows = Array.from(
      { length: MAX_REPLICATION_PUSH_DOCUMENTS + 1 },
      (_, index) => ({
        newDocumentState: { id: `event-${index}`, _deleted: false },
      }),
    );

    const response = await app.request(jsonRequest("/events/push", rows));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "too_many_documents" });
  });
});
