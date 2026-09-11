import { describe, expect, test } from "bun:test";
import type { CampusMapData } from "@courseweb/shared";
import { normalizeCampusMapData } from "./data";

const data = (await Bun.file(
  new URL("../../../public/data/nthu-main-campus.json", import.meta.url),
).json()) as CampusMapData;

describe("campus map data normalization", () => {
  test("keeps current water locations", () => {
    const normalized = normalizeCampusMapData(data);

    expect(normalized.water[0].location).toEqual(data.water[0].location);
  });

  test("recovers a missing legacy water location from its polygon", () => {
    const legacyData = structuredClone(data);
    delete (legacyData.water[0] as Partial<(typeof legacyData.water)[number]>)
      .location;

    const normalized = normalizeCampusMapData(legacyData);

    expect(normalized.water[0].location.lat).toBeFinite();
    expect(normalized.water[0].location.lon).toBeFinite();
    expect(normalized.water[0].location).not.toEqual(data.origin);
  });

  test("provides empty environment arrays for legacy map data", () => {
    const legacyData = structuredClone(data) as Partial<CampusMapData>;
    delete legacyData.areas;
    delete legacyData.trees;

    const normalized = normalizeCampusMapData(legacyData);

    expect(normalized.areas).toEqual([]);
    expect(normalized.trees).toEqual([]);
  });

  test("rejects unsupported input", () => {
    expect(() => normalizeCampusMapData({ version: 0 })).toThrow(
      "unsupported format",
    );
  });
});
