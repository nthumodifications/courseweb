import { describe, expect, test } from "bun:test";
import { Timestamp } from "@google-cloud/firestore";
import { generateAtHash } from "./athash";
import {
  firestoreRowToDocData,
  getContentByIds,
  isoStringToServerTimestamp,
  serverTimestampToIsoString,
  stripPrimaryKey,
  stripServerTimestampField,
} from "./firestore_replication/firestore_replication_utils";
import { toQueryParams } from "./objectToQuery";
import {
  MAX_JSON_DEPTH,
  batchSizeSchema,
  checkpointIdSchema,
  documentIdSchema,
  getBoundedJsonViolation,
  timestampSchema,
} from "./payload_limits";
import { sha256hash } from "./sha256";

describe("secure utility encodings", () => {
  test.each([
    // Expected values are hash test vectors, not credentials.
    ["test-token", "TF3Jt3CJBfd_Xl0WMWtd-w"], // gitleaks:allow
    ["", "47DEQpj8HBSa-_TImW-5JA"],
  ])("generates the truncated at_hash for %j", async (value, expected) => {
    expect(await generateAtHash(value)).toBe(expected);
  });

  test("returns a stable full SHA-256 digest", async () => {
    expect(await sha256hash("test-token")).toBe(
      "4c5dc9b7708905f77f5e5d16316b5dfb425e68cb326dcd55a860e90a7707031e",
    );
  });
});

describe("secure payload limits", () => {
  test.each([
    ["safe-id", true],
    ["", false],
    ["a/b", false],
    ["__name__", false],
  ])("validates document id %s", (value, expected) => {
    expect(documentIdSchema().safeParse(value).success).toBe(expected);
  });

  test("handles JSON depth, cycles, byte limits, and schema boundaries", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(
      getBoundedJsonViolation(cyclic, {
        maxBytes: 100,
        maxDepth: MAX_JSON_DEPTH,
        tooLargeCode: "value_too_large",
        tooDeepCode: "value_too_deep",
      }),
    ).toBe("invalid_json_value");
    expect(
      getBoundedJsonViolation("x", {
        maxBytes: 0,
        maxDepth: MAX_JSON_DEPTH,
        tooLargeCode: "value_too_large",
        tooDeepCode: "value_too_deep",
      }),
    ).toBe("value_too_large");
    expect(batchSizeSchema.safeParse(1).success).toBe(true);
    expect(batchSizeSchema.safeParse(0).success).toBe(false);
    expect(checkpointIdSchema.safeParse("").success).toBe(true);
    expect(timestampSchema.safeParse("2026-10-10T00:00:00Z").success).toBe(
      true,
    );
    expect(timestampSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("replication conversion utilities", () => {
  test("removes server fields, maps primary keys, and preserves timestamps", () => {
    expect(
      stripServerTimestampField("updatedAt", { updatedAt: 1, value: 2 }),
    ).toEqual({ value: 2 });
    const row = {
      id: "doc-1",
      data: () => ({ id: "old", updatedAt: Timestamp.fromMillis(0), value: 2 }),
    };
    expect(firestoreRowToDocData("updatedAt", "raw_id", row as never)).toEqual({
      raw_id: "doc-1",
      value: 2,
    });
    expect(
      serverTimestampToIsoString("updatedAt", {
        updatedAt: Timestamp.fromMillis(0),
      }),
    ).toBe("1970-01-01T00:00:00.000Z");
    expect(
      isoStringToServerTimestamp("1970-01-01T00:00:00.000Z").toMillis(),
    ).toBe(0);
    expect(stripPrimaryKey("raw_id", { raw_id: "doc-1", value: 2 })).toEqual({
      value: 2,
    });
  });

  test("batches Firestore lookups in groups of ten", async () => {
    const ids = Array.from({ length: 21 }, (_, index) => `doc-${index}`);
    const batchSizes: number[] = [];
    const rows = await getContentByIds(ids, async (batch) => {
      batchSizes.push(batch.length);
      return batch.map((id) => ({ id }) as never);
    });
    expect(batchSizes).toEqual([10, 10, 1]);
    expect(rows).toHaveLength(21);
    expect(ids).toEqual([]);
  });
});

describe("query parameter serialization", () => {
  test("serializes arrays and omits undefined values", () => {
    const params = {
      q: "環境微生物學",
      page: 0,
      tags: ["AES", "BIO"],
      missing: undefined,
    };
    expect(toQueryParams(params)).toBe(
      "q=%E7%92%B0%E5%A2%83%E5%BE%AE%E7%94%9F%E7%89%A9%E5%AD%B8&page=0&tags=AES%2CBIO",
    );
  });
});

test.todo(
  "toQueryParams should not delete undefined keys from the caller object",
);
test.todo("getContentByIds should not consume the caller-owned ids array");
