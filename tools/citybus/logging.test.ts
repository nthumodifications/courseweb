import { describe, expect, test } from "bun:test";
import { sanitizeLogValue } from "./logging";

describe("city bus log values", () => {
  test("strips control characters that could forge log lines", () => {
    expect(sanitizeLogValue("route\r\nforged: warning\u0000\u0085")).toBe(
      "routeforged: warning",
    );
  });
});
