import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, test } from "bun:test";

const source = readFileSync(
  join(import.meta.dir, "../../public/push-sw.js"),
  "utf8",
);

const loadHelpers = () => {
  const context = {
    self: {
      location: { origin: "https://nthumods.example" },
      addEventListener: () => undefined,
    },
    URL,
  } as { safeNotificationUrl?: unknown; normalizePushPayload?: unknown };
  runInNewContext(source, context);
  return {
    context,
    safeNotificationUrl: context.safeNotificationUrl as (
      value: unknown,
    ) => string | null,
    normalizePushPayload: context.normalizePushPayload as (
      value: unknown,
    ) => Record<string, unknown>,
  };
};

describe("push service worker helpers", () => {
  test("rejects backslash and cross-origin notification URLs", () => {
    const { safeNotificationUrl } = loadHelpers();

    expect(safeNotificationUrl("/zh/settings")).toBe(
      "https://nthumods.example/zh/settings",
    );
    expect(safeNotificationUrl("/\\\\evil.example/path")).toBeNull();
    expect(safeNotificationUrl("https://evil.example/path")).toBeNull();
  });

  test("normalizes every non-plain payload to a generic payload", () => {
    const { context, normalizePushPayload } = loadHelpers();

    expect(normalizePushPayload(null)).toEqual({});
    expect(normalizePushPayload("payload")).toEqual({});
    expect(normalizePushPayload([])).toEqual({});
    expect(
      runInNewContext(
        "normalizePushPayload({ title: 'Announcement' })",
        context,
      ),
    ).toEqual({ title: "Announcement" });
  });
});
