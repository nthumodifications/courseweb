import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import type { CampusBuilding } from "../../../packages/shared/src/campus";
import {
  applyCampusEnvironmentCuration,
  applyCampusMapCuration,
  compactCampusMapLabelCatalog,
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

    expect(curation.labels).toHaveLength(93);
    expect(curation.labels[0]).toEqual({
      number: 1,
      featureIds: ["osm-way-246149140-0"],
      sourceIds: ["way/246149140"],
      name: "清華會館",
    });
    expect(curation.labels.map(({ number }) => number)).toEqual(
      Array.from({ length: 93 }, (_, index) => index + 1),
    );
    expect(curation.excludedSourceIds).toContain("way/1230511808");
    expect(new Set(curation.excludedSourceIds).size).toBe(
      curation.excludedSourceIds.length,
    );
    expect(
      curation.labels.some(({ sourceIds }) =>
        sourceIds.some((sourceId) =>
          curation.excludedSourceIds.includes(sourceId),
        ),
      ),
    ).toBe(false);
    expect(curation.renamed["3"]?.zh).toBe("機車塔");
    expect(curation.renamed["92"]?.zh).toBe("室外排球場");
    expect(curation.renamed["93"]?.zh).toBe("田徑場");
    expect(curation.groups).toContainEqual({
      id: "West-Yuan-Faculty-Residences",
      labelNumber: 2,
      zh: "西院宿舍",
      en: "West Yuan Faculty Residences",
    });
    expect(curation.labels[1].sourceIds).toHaveLength(15);
    expect(curation.illustrativeTreeClusters.map(({ id }) => id)).toEqual([
      "mei-garden",
      "life-sciences",
      "student-dormitories",
      "humanities-social-sciences",
      "yi-garden",
    ]);
    expect(curation.illustrativeVegetationAreas.map(({ id }) => id)).toEqual([
      "mei-garden-hillside",
      "humanities-hillside",
      "life-sciences-hillside",
      "yi-garden-hillside",
    ]);
  });

  test("excludes by source ID and compacts rename and group label numbers", () => {
    const curation = parseCampusMapCuration({
      labels: [
        {
          number: 1,
          featureIds: ["osm-way-1-0"],
          sourceIds: ["way/1"],
          name: "Building 1",
        },
        {
          number: 2,
          featureIds: ["osm-way-2-0"],
          sourceIds: ["way/2"],
          name: "Building 2",
        },
        {
          number: 3,
          featureIds: ["osm-way-3-0", "osm-way-4-0"],
          sourceIds: ["way/3", "way/4"],
          name: "Shared Building",
        },
      ],
      excludedSourceIds: ["way/1"],
      renamed: { "2": { zh: "機車塔", en: "Motorcycle Parking Tower" } },
      groups: [
        {
          id: "shared-building",
          labelNumber: 3,
          zh: "共同建築",
          en: "Shared Building",
        },
      ],
      illustrativeTreeClusters: [],
    });
    const compacted = compactCampusMapLabelCatalog(curation);

    expect(compacted.labels.map(({ number }) => number)).toEqual([1, 2]);
    expect(compacted.labels.map(({ sourceIds }) => sourceIds)).toEqual([
      ["way/2"],
      ["way/3", "way/4"],
    ]);
    expect(compacted.renamed["1"]?.zh).toBe("機車塔");
    expect(compacted.groups[0].labelNumber).toBe(2);

    const result = applyCampusMapCuration(
      [building(1), building(2), building(3), building(4)],
      [],
      curation,
    ).buildings;

    expect(result).toHaveLength(3);
    expect(result[0].labelNumber).toBe(1);
    expect(result[0].names).toEqual({
      zh: "機車塔",
      en: "Motorcycle Parking Tower",
    });
    expect(result[1].labelGroupId).toBe("curation:shared-building");
    expect(result[2].labelGroupId).toBe("curation:shared-building");
    expect(result[1].labelNumber).toBe(2);
    expect(result[2].labelNumber).toBe(2);
    expect(result[1].names).toEqual({ zh: "共同建築", en: "Shared Building" });
  });

  test("syncs new labels once and preserves their assigned numbers", () => {
    const initial = parseCampusMapCuration({
      labels: [],
      excludedSourceIds: [],
      renamed: {},
      groups: [],
      illustrativeTreeClusters: [],
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
    const reindexed = syncCampusMapLabelCatalog(
      [{ ...building(2), id: "osm-way-2-1" }, building(1), building(3)],
      [],
      resynced,
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
    expect(reindexed.labels).toHaveLength(3);
    expect(
      reindexed.labels
        .find((label) => label.sourceIds[0] === "way/2")
        ?.featureIds.includes("osm-way-2-1"),
    ).toBe(true);
  });

  test("does not restore permanently excluded sources during label sync", () => {
    const curation = parseCampusMapCuration({
      labels: [],
      excludedSourceIds: ["way/1"],
      renamed: {},
      groups: [],
    });
    const synced = syncCampusMapLabelCatalog(
      [building(1), building(2)],
      [],
      curation,
    );

    expect(synced.labels).toHaveLength(1);
    expect(synced.labels[0]).toMatchObject({
      number: 1,
      sourceIds: ["way/2"],
    });
    expect(
      applyCampusMapCuration([building(1), building(2)], [], synced).buildings,
    ).toHaveLength(1);
  });

  test("removes only the excluded member from a merged label", () => {
    const curation = parseCampusMapCuration({
      labels: [
        {
          number: 1,
          featureIds: ["osm-way-1-0", "osm-way-2-0"],
          sourceIds: ["way/1", "way/2"],
          name: "Shared Building",
        },
      ],
      excludedSourceIds: ["way/1"],
      renamed: {},
      groups: [
        {
          id: "shared-building",
          labelNumber: 1,
          zh: "共同建築",
          en: "Shared Building",
        },
      ],
    });
    const compacted = compactCampusMapLabelCatalog(curation);

    expect(compacted.labels[0]).toMatchObject({
      number: 1,
      featureIds: ["osm-way-2-0"],
      sourceIds: ["way/2"],
    });
    expect(compacted.groups[0].labelNumber).toBe(1);
    expect(
      applyCampusMapCuration([building(1), building(2)], [], compacted)
        .buildings,
    ).toMatchObject([
      {
        id: "osm-way-2-0",
        labelNumber: 1,
        labelGroupId: "curation:shared-building",
      },
    ]);
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
        excludedSourceIds: [],
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
        excludedSourceIds: [],
        renamed: {},
        groups: [
          { id: "a", labelNumber: 1, zh: "A" },
          { id: "b", labelNumber: 1, zh: "B" },
        ],
        illustrativeTreeClusters: [],
      }),
    ).toThrow("multiple groups");
    expect(() =>
      parseCampusMapCuration({
        labels: [],
        excludedSourceIds: ["way/1", "way/1"],
        renamed: {},
        groups: [],
      }),
    ).toThrow("Duplicate excluded OSM source ID");
    expect(() =>
      parseCampusMapCuration({
        labels: [
          {
            number: 1,
            featureIds: ["osm-way-1-0"],
            sourceIds: ["way/1"],
            name: "Part 1",
          },
          {
            number: 2,
            featureIds: ["osm-way-1-1"],
            sourceIds: ["way/1"],
            name: "Part 2",
          },
        ],
        excludedSourceIds: [],
        renamed: {},
        groups: [],
      }),
    ).toThrow("Duplicate campus map source ID");
  });

  test("rejects invalid illustrative tree coordinates", () => {
    expect(() =>
      parseCampusMapCuration({
        labels: [],
        excludedSourceIds: [],
        renamed: {},
        groups: [],
        illustrativeTreeClusters: [
          {
            id: "invalid-trees",
            locations: [{ lat: 120, lon: 24.79 }],
          },
        ],
      }),
    ).toThrow("valid lat/lon coordinates");
  });

  test("rejects invalid illustrative vegetation polygons", () => {
    expect(() =>
      parseCampusMapCuration({
        labels: [],
        excludedSourceIds: [],
        renamed: {},
        groups: [],
        illustrativeVegetationAreas: [
          {
            id: "invalid-vegetation",
            kind: "wood",
            polygon: [
              { lat: 24.79, lon: 120.99 },
              { lat: 24.791, lon: 120.991 },
            ],
          },
        ],
      }),
    ).toThrow("at least three vertices");
  });

  test("assigns stable numbers and names to labeled outdoor areas", () => {
    const curation = parseCampusMapCuration({
      labels: [
        {
          number: 1,
          featureIds: ["osm-way-42-0"],
          sourceIds: ["way/42"],
          name: "Volleyball",
        },
      ],
      excludedSourceIds: [],
      renamed: {
        "1": { zh: "室外排球場", en: "Outdoor Volleyball Courts" },
      },
      groups: [],
    });

    expect(
      applyCampusEnvironmentCuration(
        [
          {
            id: "osm-way-42-0",
            kind: "sports-pitch",
            sport: "volleyball",
            location: { lat: 24.79, lon: 120.99 },
            polygon: [],
          },
        ],
        curation,
      )[0],
    ).toMatchObject({
      labelNumber: 1,
      names: { zh: "室外排球場", en: "Outdoor Volleyball Courts" },
    });
  });
});
