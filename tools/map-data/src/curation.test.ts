import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import type { CampusBuilding } from "../../../packages/shared/src/campus";
import {
  applyCampusMapCuration,
  loadCampusMapCuration,
  parseCampusMapCuration,
} from "./curation";

function building(id: number): CampusBuilding {
  return {
    id: `osm-way-${id}-0`,
    source: { type: "way", id },
    names: { zh: `Building ${id}` },
    location: { lat: 24.79, lon: 120.99 },
    geometry: { footprint: [] },
  };
}

describe("campus map curation", () => {
  test("loads the editable repository curation file", async () => {
    const curation = await loadCampusMapCuration(
      fileURLToPath(new URL("../campus-map-curation.json", import.meta.url)),
    );

    expect(curation).toEqual({ excluded: [], renamed: {}, groups: [] });
  });

  test("excludes, renames, and groups buildings by stable OSM source IDs", () => {
    const curation = parseCampusMapCuration({
      excluded: ["way/1"],
      renamed: { "way/2": { zh: "機車塔", en: "Motorcycle Parking Tower" } },
      groups: [
        {
          id: "shared-building",
          sourceIds: ["way/3", "way/4"],
          zh: "共同建築",
          en: "Shared Building",
        },
      ],
    });

    const result = applyCampusMapCuration(
      [building(1), building(2), building(3), building(4)],
      curation,
    );

    expect(result).toHaveLength(3);
    expect(result[0].names).toEqual({
      zh: "機車塔",
      en: "Motorcycle Parking Tower",
    });
    expect(result[1].labelGroupId).toBe("curation:shared-building");
    expect(result[2].labelGroupId).toBe("curation:shared-building");
    expect(result[1].names).toEqual({ zh: "共同建築", en: "Shared Building" });
  });

  test("rejects unstable source IDs and duplicate group membership", () => {
    expect(() =>
      parseCampusMapCuration({
        excluded: ["osm-way-1-0"],
        renamed: {},
        groups: [],
      }),
    ).toThrow("way/123");
    expect(() =>
      parseCampusMapCuration({
        excluded: [],
        renamed: {},
        groups: [
          { id: "a", sourceIds: ["way/1"], zh: "A" },
          { id: "b", sourceIds: ["way/1"], zh: "B" },
        ],
      }),
    ).toThrow("multiple groups");
  });
});
