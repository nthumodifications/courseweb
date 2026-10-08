import type { Context } from "hono";
import { z } from "zod";

export const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_JSON_VALUE_BYTES = 512 * 1024;
export const MAX_REPLICATION_DOCUMENT_BYTES = 128 * 1024;
export const MAX_JSON_DEPTH = 50;
export const MAX_REPLICATION_BATCH_SIZE = 100;
export const MAX_REPLICATION_PUSH_DOCUMENTS = 100;
export const MAX_DOCUMENT_ID_LENGTH = 100;

type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonViolation =
  | "invalid_json_value"
  | "value_too_large"
  | "value_too_deep"
  | "document_too_large"
  | "document_too_deep";

const isPlainObject = (value: object) => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const checkJsonShape = (
  value: unknown,
  depth: number,
  maxDepth: number,
  seen: WeakSet<object>,
): JsonViolation | null => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? null : "invalid_json_value";
  }

  if (
    typeof value !== "object" ||
    (!Array.isArray(value) && !isPlainObject(value))
  ) {
    return "invalid_json_value";
  }

  if (depth > maxDepth) return "value_too_deep";
  if (seen.has(value)) return "invalid_json_value";
  seen.add(value);

  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    const violation = checkJsonShape(child, depth + 1, maxDepth, seen);
    if (violation) return violation;
  }

  seen.delete(value);
  return null;
};

export const getBoundedJsonViolation = (
  value: unknown,
  options: {
    maxBytes: number;
    maxDepth: number;
    tooLargeCode: "value_too_large" | "document_too_large";
    tooDeepCode: "value_too_deep" | "document_too_deep";
  },
): JsonViolation | null => {
  const shapeViolation = checkJsonShape(
    value,
    0,
    options.maxDepth,
    new WeakSet(),
  );
  if (shapeViolation === "value_too_deep") return options.tooDeepCode;
  if (shapeViolation) return shapeViolation;

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return "invalid_json_value";
  }

  if (serialized === undefined) return "invalid_json_value";
  if (new TextEncoder().encode(serialized).byteLength > options.maxBytes) {
    return options.tooLargeCode;
  }

  return null;
};

const jsonValueBase: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueBase),
    z.record(z.string(), jsonValueBase),
  ]),
);

/**
 * A non-transforming JSON schema. The recursive union requires a value while
 * the refinement only rejects values that exceed the resource limits.
 */
export const jsonValueSchema = jsonValueBase.superRefine((value, ctx) => {
  const violation = getBoundedJsonViolation(value, {
    maxBytes: MAX_JSON_VALUE_BYTES,
    maxDepth: MAX_JSON_DEPTH,
    tooLargeCode: "value_too_large",
    tooDeepCode: "value_too_deep",
  });
  if (violation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: violation });
  }
});

// Firestore rejects "/" in a document id, the ids "." and "..", and ids of
// the form __name__. Everything else that fits the client schema is a valid id
// and must keep syncing, so nothing more is refused here.
const isSafeDocumentId = (value: string, maxLength = MAX_DOCUMENT_ID_LENGTH) =>
  value.length > 0 &&
  value.length <= maxLength &&
  !value.includes("/") &&
  value !== "." &&
  value !== ".." &&
  !/^__.*__$/.test(value);

export const documentIdSchema = (maxLength = MAX_DOCUMENT_ID_LENGTH) =>
  z.string().refine((value) => isSafeDocumentId(value, maxLength), {
    message: "invalid_document_id",
  });

export const checkpointIdSchema = z
  .string()
  .refine((value) => value === "" || isSafeDocumentId(value), {
    message: "invalid_document_id",
  });

export const timestampSchema = z
  .string()
  .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
    message: "invalid_timestamp",
  });

export const batchSizeSchema = z.coerce
  .number({ invalid_type_error: "invalid_batch_size" })
  .int("invalid_batch_size")
  .min(1, "invalid_batch_size")
  .max(MAX_REPLICATION_BATCH_SIZE, "invalid_batch_size");

export const kvKeyParamSchema = z.object({
  key: z
    .string()
    .min(1, "invalid_key")
    .max(32, "invalid_key")
    .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, "invalid_key"),
});

export const boundedReplicationDocumentSchema = <T extends z.ZodRawShape>(
  shape: T,
) =>
  z
    .object(shape)
    .passthrough()
    .superRefine((value, ctx) => {
      const violation = getBoundedJsonViolation(value, {
        maxBytes: MAX_REPLICATION_DOCUMENT_BYTES,
        maxDepth: MAX_JSON_DEPTH,
        tooLargeCode: "document_too_large",
        tooDeepCode: "document_too_deep",
      });
      if (violation) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: violation });
      }
    });

export const zodValidationError = (
  result: {
    success: boolean;
    error?: { issues: Array<{ message: string }> };
  },
  c: Context,
) => {
  if (result.success) return;

  const message = result.error?.issues[0]?.message;
  const error =
    message && /^[a-z_]+$/.test(message) ? message : "invalid_payload";
  return c.json({ error }, 400);
};

export const payloadTooLarge = (c: Context) =>
  c.json({ error: "payload_too_large" }, 413);
