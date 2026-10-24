import { describe, expect, test } from "bun:test";
import { hasDeepLinkRequestChanged } from "./deep-link";

describe("deep-link request tracking", () => {
  test("does not reapply an unchanged request", () => {
    expect(hasDeepLinkRequestChanged("same", "same")).toBe(false);
  });
});
