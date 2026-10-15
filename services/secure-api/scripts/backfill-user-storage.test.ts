import { describe, expect, test } from "bun:test";
import { runBackfill, setBackfillExitCode } from "./backfill-user-storage";

const record = {
  value: { ok: true },
  lastModified: 1,
  updatedAt: 1,
  deviceId: "device-a",
};

const page = {
  documents: [
    {
      path: "users/user-1/storage/courses",
      record,
    },
  ],
  nextCursor: undefined,
};

const documentFor = (userId: string) => ({
  path: `users/${userId}/storage/courses`,
  record,
});

test("uses bounded concurrency for apply writes", async () => {
  let active = 0;
  let maximumActive = 0;
  const documents = Array.from({ length: 8 }, (_, index) =>
    documentFor(`user-${index}`),
  );

  const counts = await runBackfill({
    firestore: {
      listAllPage: async () => ({ documents, nextCursor: undefined }),
    },
    postgres: {
      get: async () => {
        throw new Error("apply mode must not pre-read");
      },
      put: async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return true;
      },
    },
    dryRun: false,
    concurrency: 3,
  });

  expect(maximumActive).toBe(3);
  expect(counts.copied).toBe(8);
  expect(counts.errors).toBe(0);
});

test("keeps the dry-run read and does not write", async () => {
  let reads = 0;
  let writes = 0;
  const counts = await runBackfill({
    firestore: {
      listAllPage: async () => page,
    },
    postgres: {
      get: async () => {
        reads += 1;
        return undefined;
      },
      put: async () => {
        writes += 1;
        return true;
      },
    },
    dryRun: true,
  });

  expect(reads).toBe(1);
  expect(writes).toBe(0);
  expect(counts.missing).toBe(1);
  expect(counts.copied).toBe(0);
  expect(counts.errors).toBe(0);
});

describe("user storage backfill failures", () => {
  test.each([
    [
      "page reads",
      {
        listAllPage: async () => {
          throw new Error("page unavailable");
        },
        get: async () => undefined,
        put: async () => true,
      },
    ],
    [
      "row reads",
      {
        listAllPage: async () => page,
        get: async () => {
          throw new Error("row read unavailable");
        },
        put: async () => true,
      },
    ],
    [
      "row writes",
      {
        listAllPage: async () => page,
        get: async () => undefined,
        put: async () => {
          throw new Error("row write unavailable");
        },
      },
    ],
  ])("sets a non-zero exit status after failed %s", async (_kind, stores) => {
    process.exitCode = undefined;
    try {
      const counts = await runBackfill({
        firestore: stores,
        postgres: stores,
        dryRun: _kind === "row reads",
      });

      expect(counts.errors).toBe(1);
      setBackfillExitCode(counts);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = 0;
    }
  });
});
