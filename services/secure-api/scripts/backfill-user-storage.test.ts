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
        dryRun: false,
      });

      expect(counts.errors).toBe(1);
      setBackfillExitCode(counts);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = 0;
    }
  });
});
