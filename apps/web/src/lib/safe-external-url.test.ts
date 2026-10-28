import { describe, expect, test } from "bun:test";
import { safeExternalUrl } from "./safe-external-url";

describe("safeExternalUrl", () => {
  test("keeps HTTP and HTTPS URLs", () => {
    expect(safeExternalUrl("http://example.com/path")).toBe(
      "http://example.com/path",
    );
    expect(safeExternalUrl("https://example.com/path")).toBe(
      "https://example.com/path",
    );
  });

  test("rejects executable, data, and malformed URLs", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(
      safeExternalUrl("data:text/html,<script>alert(1)</script>"),
    ).toBeNull();
    expect(safeExternalUrl("not a URL")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });
});
