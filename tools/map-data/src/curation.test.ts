import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import type { CampusBuilding } from "../../../packages/shared/src/campus";
import {
  applyCampusMapCuration,
  loadCampusMapCuration,
  parseCampusMapCuration,
  syncCampusMapLabelCatalog,
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

    expect(curation.labels).toHaveLength(229);
    expect(curation.labels[0]).toEqual({
      number: 1,
      featureIds: ["osm-way-1230511808-0"],
      sourceIds: ["way/1230511808"],
      name: "科學樓",
    });
    expect(curation.excluded).toHaveLength(108);
    expect(curation.excluded).toContain(1);
    expect(Object.keys(curation.renamed)).toEqual([
      "53",
      "98",
      "104",
      "124",
      "202",
    ]);
    expect(curation.groups.map(({ id }) => id)).toEqual([
      "hung-dorm",
      "shiue-dorm",
      "yi-dorm",
      "cheng-dorm",
      "shyr-dorm",
      "West-Yuan-Faculty-Residences",
    ]);
  });

  test("excludes, renames, and groups buildings by hardcoded label numbers", () => {
    const curation = parseCampusMapCuration({
      labels: [1, 2, 3, 4].map((number) => ({
        number,
        featureIds: [`osm-way-${number}-0`],
        sourceIds: [`way/${number}`],
        name: `Building ${number}`,
      })),
      excluded: [1],
      renamed: { "2": { zh: "機車塔", en: "Motorcycle Parking Tower" } },
      groups: [
        {
          id: "shared-building",
          labelNumbers: [3, 4],
          zh: "共同建築",
          en: "Shared Building",
        },
      ],
    });

    const result = applyCampusMapCuration(
      [building(1), building(2), building(3), building(4)],
      [],
      curation,
    ).buildings;

    expect(result).toHaveLength(3);
    expect(result[0].labelNumber).toBe(2);
    expect(result[0].names).toEqual({
      zh: "機車塔",
      en: "Motorcycle Parking Tower",
    });
    expect(result[1].labelGroupId).toBe("curation:shared-building");
    expect(result[2].labelGroupId).toBe("curation:shared-building");
    expect(result[1].labelNumber).toBe(3);
    expect(result[2].labelNumber).toBe(3);
    expect(result[1].names).toEqual({ zh: "共同建築", en: "Shared Building" });
  });

  test("syncs new labels once and preserves their assigned numbers", () => {
    const initial = parseCampusMapCuration({
      labels: [],
      excluded: [],
      renamed: {},
      groups: [],
    });
    const synced = syncCampusMapLabelCatalog(
      [building(1), { ...building(2), location: { lat: 24.8, lon: 120.99 } }],
      [],
      initial,
    );
    const resynced = syncCampusMapLabelCatalog(
      [building(1), building(2), building(3)],
      [],
      synced,
    );

    expect(synced.labels.map((label) => label.sourceIds[0])).toEqual([
      "way/2",
      "way/1",
    ]);
    expect(
      resynced.labels.find((label) => label.sourceIds[0] === "way/2")?.number,
    ).toBe(1);
    expect(
      resynced.labels.find((label) => label.sourceIds[0] === "way/3")?.number,
    ).toBe(3);
  });

  test("rejects invalid feature IDs and duplicate group membership", () => {
    expect(() =>
      parseCampusMapCuration({
        labels: [
          {
            number: 1,
            featureIds: ["invalid"],
            sourceIds: ["way/1"],
            name: "Invalid",
          },
        ],
        excluded: [],
        renamed: {},
        groups: [],
      }),
    ).toThrow("generated osm-way-123-0");
    expect(() =>
      parseCampusMapCuration({
        labels: [1].map((number) => ({
          number,
          featureIds: [`osm-way-${number}-0`],
          sourceIds: [`way/${number}`],
          name: "Building",
        })),
        excluded: [],
        renamed: {},
        groups: [
          { id: "a", labelNumbers: [1, 2], zh: "A" },
          { id: "b", labelNumbers: [1, 3], zh: "B" },
        ],
      }),
    ).toThrow("multiple groups");
  });
});
