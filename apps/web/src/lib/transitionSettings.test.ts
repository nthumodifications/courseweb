import { describe, expect, test } from "bun:test";
import { getTransitionDuration } from "./transitionSettings";

describe("persisted transition speed mapping", () => {
  test.each([
    ["instant", "0ms"],
    ["fast", "75ms"],
    ["default", "150ms"],
    ["slow", "300ms"],
  ] as const)("maps %s to %s", (speed, expected) => {
    expect(getTransitionDuration(speed)).toBe(expected);
  });

  test("defaults older saved theme preferences and reduced motion to instant", () => {
    expect(getTransitionDuration(undefined)).toBe("150ms");
    expect(getTransitionDuration("slow", true)).toBe("0ms");
  });
});
