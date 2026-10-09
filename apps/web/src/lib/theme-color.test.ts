import { describe, expect, test } from "bun:test";
import { themeColorForMode } from "./theme-color";

describe("theme color", () => {
  test("uses dark text contrast colors for each app mode", () => {
    expect(themeColorForMode("light")).toBe("#ffffff");
    expect(themeColorForMode("dark")).toBe("#171717");
  });
});
