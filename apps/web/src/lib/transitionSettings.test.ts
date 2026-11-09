import { describe, expect, test } from "bun:test";
import {
  getTransitionDuration,
  getTransitionSpeedAttribute,
} from "./transitionSettings";

describe("persisted transition speed mapping", () => {
  test.each([
    ["instant", "0ms"],
    ["fast", "75ms"],
    ["default", "150ms"],
    ["slow", "300ms"],
  ] as const)("maps %s to %s", (speed, expected) => {
    expect(getTransitionDuration(speed)).toBe(expected);
  });

  test("keeps default transitions unchanged when reduced motion is enabled", () => {
    expect(getTransitionDuration(undefined)).toBe("150ms");
    expect(getTransitionDuration(undefined, true)).toBe("150ms");
    expect(getTransitionDuration("default", true)).toBe("150ms");
  });

  test("reduced motion only makes a selected custom speed instant", () => {
    expect(getTransitionDuration("slow", true)).toBe("0ms");
    expect(getTransitionDuration("fast", true)).toBe("0ms");
    expect(getTransitionDuration("instant", true)).toBe("0ms");
  });

  test("only writes a data attribute for a selected non-default speed", () => {
    expect(getTransitionSpeedAttribute(undefined)).toBeUndefined();
    expect(getTransitionSpeedAttribute("default")).toBeUndefined();
    expect(getTransitionSpeedAttribute("instant")).toBe("instant");
    expect(getTransitionSpeedAttribute("fast")).toBe("fast");
    expect(getTransitionSpeedAttribute("slow")).toBe("slow");
  });
});
