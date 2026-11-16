import { describe, expect, test } from "bun:test";
import { simplifyLine, type LatLon } from "./shapes-lib";

describe("simplifyLine", () => {
  test("drops collinear and repeated points but keeps the ends", () => {
    const line: LatLon[] = [
      [24.8, 120.97],
      [24.8, 120.97],
      [24.8005, 120.97],
      [24.801, 120.97],
    ];
    expect(simplifyLine(line)).toEqual([
      [24.8, 120.97],
      [24.801, 120.97],
    ]);
  });

  test("keeps a real corner", () => {
    const line: LatLon[] = [
      [24.8, 120.97],
      [24.8, 120.98],
      [24.81, 120.98],
    ];
    expect(simplifyLine(line)).toHaveLength(3);
  });
});
