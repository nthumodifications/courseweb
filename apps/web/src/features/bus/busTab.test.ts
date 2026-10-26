import { describe, expect, test } from "bun:test";
import { normalizeBusTab } from "./busTab";

describe("bus tab deep links", () => {
  test.each([
    { value: undefined, expected: "north_gate" },
    { value: null, expected: "north_gate" },
    { value: "bogus", expected: "north_gate" },
    { value: "north_gate", expected: "north_gate" },
    { value: "tsmc", expected: "tsmc" },
    { value: "nanda", expected: "nanda" },
    { value: "city", expected: "city" },
  ])("normalizes $value", ({ value, expected }) => {
    expect(normalizeBusTab(value)).toBe(expected);
  });
});
