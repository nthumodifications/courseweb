import { describe, expect, test } from "bun:test";
import { statusBarStyleForMode, themeColorForMode } from "./theme-color";

describe("theme color", () => {
  test("uses matching browser chrome colors for each app mode", () => {
    expect(themeColorForMode("light")).toBe("#ffffff");
    expect(themeColorForMode("dark")).toBe("#171717");
    expect(statusBarStyleForMode("light")).toBe("default");
    expect(statusBarStyleForMode("dark")).toBe("black");
  });
});
