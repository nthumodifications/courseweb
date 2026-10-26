import { describe, expect, test } from "bun:test";
import { linesDict } from "./campusBusLines";

describe("campus bus line station translations", () => {
  test("keeps Chinese and English station arrays aligned for every line", () => {
    for (const line of Object.values(linesDict)) {
      expect(line.stations_en).toHaveLength(line.stations_zh.length);
    }
  });
});
