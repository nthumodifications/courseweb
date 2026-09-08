import { describe, expect, test } from "bun:test";
import {
  CAMPUS_FLOOR_HEIGHT,
  DEFAULT_BUILDING_HEIGHT,
  resolveBuildingHeight,
} from "./sceneLogic";

describe("campus building height", () => {
  test("prefers an explicit OSM height", () => {
    expect(resolveBuildingHeight(27, 9)).toBe(27);
  });

  test("uses building levels when height is absent", () => {
    expect(resolveBuildingHeight(undefined, 4)).toBe(4 * CAMPUS_FLOOR_HEIGHT);
  });

  test("uses a stable fallback for incomplete metadata", () => {
    expect(resolveBuildingHeight()).toBe(DEFAULT_BUILDING_HEIGHT);
    expect(resolveBuildingHeight(0, 0)).toBe(DEFAULT_BUILDING_HEIGHT);
  });
});
