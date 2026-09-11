import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  clipGeoPolylineToBounds,
  findCampusIdentityForOsmFeature,
  NTHU_MAIN_CAMPUS_ORIGIN,
  type CampusAreaFeature,
  type CampusBuilding,
  type CampusLinearFeature,
  type CampusMapData,
  type CampusTree,
  type GeoCoordinate,
} from "../../../packages/shared/src/campus";
import {
  applyCampusEnvironmentCuration,
  applyCampusMapCuration,
  compactCampusMapLabelCatalog,
  loadCampusMapCuration,
  syncCampusMapLabelCatalog,
  type CampusMapCuration,
  writeCampusMapCuration,
} from "./curation";
import {
  classifyEnvironmentArea,
  clipPolylineToPolygons,
  closeRing,
  extractTreeLocations,
  pointInPolygons,
  relationPolygonRings,
  type OsmElement,
  type OsmPoint,
  type OsmPolygonRings,
  type OsmTags,
} from "./osmEnvironment";

const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const CURATION_PATH = resolve(import.meta.dir, "../campus-map-curation.json");
const OUTPUT_PATH = resolve(
  import.meta.dir,
  "../../../apps/web/public/data/nthu-main-campus.json",
);

const bounds = {
  south: 24.7854,
  west: 120.987,
  north: 24.7982,
  east: 120.9975,
};

const CAMPUS_WATER_NAMES: Record<
  string,
  NonNullable<CampusAreaFeature["names"]>
> = {
  "way/220880239": { zh: "昆明湖", en: "Kun Ming Lake" },
  "relation/3927538": { zh: "成功湖", en: "Cheng Kung Lake" },
};

type OverpassResponse = {
  osm3s?: { timestamp_osm_base?: string };
  elements: OsmElement[];
};

const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
const query = `[out:json][timeout:90];
(
  way["building"](${bbox});
  relation["building"](${bbox});
  way["highway"~"^(primary|secondary|tertiary|residential|service|pedestrian|footway|path|steps)$"](${bbox});
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
  way["waterway"="riverbank"](${bbox});
  way["leisure"~"^(pitch|track|park)$"](${bbox});
  relation["leisure"~"^(pitch|track|park)$"](${bbox});
  way["landuse"~"^(grass|recreation_ground|forest)$"](${bbox});
  relation["landuse"~"^(grass|recreation_ground|forest)$"](${bbox});
  way["natural"="wood"](${bbox});
  relation["natural"="wood"](${bbox});
  way["amenity"="parking"](${bbox});
  relation["amenity"="parking"](${bbox});
  node["natural"="tree"](${bbox});
  way["natural"="tree_row"](${bbox});
  relation["amenity"="university"]["name"~"清華|Tsing Hua"](${bbox});
);
out body geom;`;

function roundCoordinate(value: number): number {
  return Number(value.toFixed(7));
}

function toCoordinate(point: OsmPoint): GeoCoordinate {
  return [roundCoordinate(point.lon), roundCoordinate(point.lat)];
}

function polygonCenter(points: GeoCoordinate[]): { lat: number; lon: number } {
  const unique = points.length > 1 ? points.slice(0, -1) : points;
  const sum = unique.reduce(
    (result, [lon, lat]) => ({ lat: result.lat + lat, lon: result.lon + lon }),
    { lat: 0, lon: 0 },
  );
  const count = Math.max(unique.length, 1);
  return { lat: sum.lat / count, lon: sum.lon / count };
}

function parsePositiveNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function namesFromTags(tags: OsmTags): string[] {
  return [tags["name:zh"], tags.name, tags["name:en"], tags.alt_name].filter(
    (value): value is string => Boolean(value),
  );
}

function createBuildingParts(element: OsmElement): CampusBuilding[] {
  const tags = element.tags ?? {};
  const polygons =
    element.type === "relation"
      ? relationPolygonRings(element)
      : element.geometry
        ? [closeRing(element.geometry)]
            .filter((ring): ring is OsmPoint[] => Boolean(ring))
            .map((outer) => ({ outer, holes: [] }))
        : [];
  const identity =
    element.type === "way" || element.type === "relation"
      ? findCampusIdentityForOsmFeature(
          element.type,
          element.id,
          namesFromTags(tags),
        )
      : undefined;

  return polygons.map(({ outer, holes }, partIndex) => {
    const footprint = outer.map(toCoordinate);
    const names = identity?.names ?? {
      zh: tags["name:zh"] ?? tags.name ?? "校園建築",
      en: tags["name:en"],
    };

    return {
      id: `osm-${element.type}-${element.id}-${partIndex}`,
      identityId: identity?.id,
      source: { type: element.type as "way" | "relation", id: element.id },
      names,
      venue: identity?.venue,
      location: polygonCenter(footprint),
      geometry: {
        footprint,
        ...(holes.length > 0
          ? { holes: holes.map((ring) => ring.map(toCoordinate)) }
          : {}),
        height: parsePositiveNumber(tags.height),
        levels: parsePositiveNumber(tags["building:levels"]),
      },
      googleMaps: identity
        ? { query: `${identity.names.zh} 國立清華大學` }
        : undefined,
    };
  });
}

function roadWidth(highway: string): number {
  const widths: Record<string, number> = {
    primary: 8,
    secondary: 7,
    tertiary: 6,
    residential: 5,
    service: 3.5,
    pedestrian: 4,
    footway: 1.6,
    path: 1.4,
    steps: 1.2,
  };
  return widths[highway] ?? 2;
}

function roadClass(
  highway: string,
): NonNullable<CampusLinearFeature["roadClass"]> | undefined {
  if (["primary", "secondary", "tertiary"].includes(highway)) return "major";
  if (highway === "residential") return "local";
  if (highway === "service") return "service";
  return undefined;
}

function createLinearFeatures(
  element: OsmElement,
  campusClipPolygons: OsmPolygonRings[],
): CampusLinearFeature[] {
  const highway = element.tags?.highway;
  if (!highway || !element.geometry || element.geometry.length < 2) return [];
  const kind = ["footway", "path", "steps", "pedestrian"].includes(highway)
    ? "path"
    : "road";
  const sourceParts = clipPolylineToPolygons(
    element.geometry,
    campusClipPolygons,
  );
  const parts = sourceParts.flatMap((part) =>
    clipGeoPolylineToBounds(part.map(toCoordinate), bounds),
  );
  return parts.map((points, index) => ({
    id: `osm-way-${element.id}${parts.length > 1 ? `-${index}` : ""}`,
    kind,
    ...(kind === "road" ? { roadClass: roadClass(highway) } : {}),
    points,
    width: roadWidth(highway),
  }));
}

function createAreaParts(
  element: OsmElement,
  kind: CampusAreaFeature["kind"],
  sport?: string,
): CampusAreaFeature[] {
  const polygons =
    element.type === "relation"
      ? relationPolygonRings(element)
      : element.geometry
        ? [closeRing(element.geometry)]
            .filter((ring): ring is OsmPoint[] => Boolean(ring))
            .map((outer) => ({ outer, holes: [] }))
        : [];
  const tags = element.tags ?? {};
  const elementId = `${element.type}/${element.id}`;
  const names =
    kind === "water"
      ? (CAMPUS_WATER_NAMES[elementId] ??
        (tags.name
          ? {
              zh: tags["name:zh"] ?? tags.name,
              en: tags["name:en"],
            }
          : undefined))
      : undefined;

  return polygons.map(({ outer, holes }, index) => {
    const polygon = outer.map(toCoordinate);
    return {
      id: `osm-${element.type}-${element.id}-${index}`,
      kind,
      ...(sport ? { sport } : {}),
      names,
      location: polygonCenter(polygon),
      polygon,
      ...(holes.length > 0
        ? { holes: holes.map((ring) => ring.map(toCoordinate)) }
        : {}),
    };
  });
}

function pointInsideCampus(
  point: { lat: number; lon: number },
  campusPolygons: OsmPolygonRings[],
): boolean {
  return pointInPolygons(point, campusPolygons);
}

function createEnvironmentAreas(
  elements: OsmElement[],
  campusPolygons: OsmPolygonRings[],
): CampusAreaFeature[] {
  return elements.flatMap((element) => {
    const classification = classifyEnvironmentArea(element.tags ?? {});
    if (!classification) return [];
    return createAreaParts(
      element,
      classification.kind,
      classification.sport,
    ).filter((area) => pointInsideCampus(area.location, campusPolygons));
  });
}

function createTrees(
  elements: OsmElement[],
  campusPolygons: OsmPolygonRings[],
): CampusTree[] {
  return elements.flatMap((element) =>
    extractTreeLocations(element).flatMap((location, index) => {
      if (!pointInsideCampus(location, campusPolygons)) return [];
      const suffix = element.type === "way" ? `-${index}` : "";
      return [
        {
          id: `osm-${element.type}-${element.id}${suffix}`,
          location: {
            lat: roundCoordinate(location.lat),
            lon: roundCoordinate(location.lon),
          },
        },
      ];
    }),
  );
}

function createIllustrativeTrees(
  curation: CampusMapCuration,
  campusPolygons: OsmPolygonRings[],
): CampusTree[] {
  return curation.illustrativeTreeClusters.flatMap((cluster) =>
    cluster.locations.map((location, index) => {
      if (!pointInsideCampus(location, campusPolygons)) {
        throw new Error(
          `Illustrative tree ${cluster.id}-${index + 1} is outside the NTHU campus boundary`,
        );
      }
      return {
        id: `curation-${cluster.id}-${index + 1}`,
        location: {
          lat: roundCoordinate(location.lat),
          lon: roundCoordinate(location.lon),
        },
      };
    }),
  );
}

function createIllustrativeVegetationAreas(
  curation: CampusMapCuration,
  campusPolygons: OsmPolygonRings[],
): CampusAreaFeature[] {
  return curation.illustrativeVegetationAreas.map((area) => {
    const outsidePoint = area.polygon.find(
      (location) => !pointInsideCampus(location, campusPolygons),
    );
    if (outsidePoint) {
      throw new Error(
        `Illustrative vegetation area ${area.id} is outside the NTHU campus boundary at ${outsidePoint.lat}, ${outsidePoint.lon}`,
      );
    }
    const polygon = area.polygon.map(({ lat, lon }) =>
      toCoordinate({ lat, lon }),
    );
    const [firstLon, firstLat] = polygon[0];
    const [lastLon, lastLat] = polygon.at(-1)!;
    if (firstLon !== lastLon || firstLat !== lastLat) polygon.push(polygon[0]);
    return {
      id: `curation-vegetation-${area.id}`,
      kind: area.kind,
      location: polygonCenter(polygon),
      polygon,
    };
  });
}

function countIncludedTreeRows(
  elements: OsmElement[],
  campusPolygons: OsmPolygonRings[],
): number {
  return elements.filter(
    (element) =>
      element.tags?.natural === "tree_row" &&
      extractTreeLocations(element).some((location) =>
        pointInsideCampus(location, campusPolygons),
      ),
  ).length;
}

function polygonArea(feature: CampusAreaFeature): number {
  return Math.abs(
    feature.polygon.reduce((area, point, index, points) => {
      const next = points[(index + 1) % points.length];
      return area + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2,
  );
}

function osmPolygonArea({ outer }: OsmPolygonRings): number {
  return Math.abs(
    outer.reduce((area, point, index, points) => {
      const next = points[(index + 1) % points.length];
      return area + point.lon * next.lat - next.lon * point.lat;
    }, 0) / 2,
  );
}

async function fetchOverpassData(): Promise<OverpassResponse> {
  const failures: string[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(
        `${endpoint}?data=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "NTHUMods-CourseWeb-map-data/1.0 (https://github.com/nthumodifications/courseweb)",
          },
        },
      );
      if (response.ok) return (await response.json()) as OverpassResponse;
      failures.push(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      failures.push(
        `${endpoint}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(`All Overpass endpoints failed:\n${failures.join("\n")}`);
}

async function main() {
  const curation = await loadCampusMapCuration(CURATION_PATH);
  const osm = await fetchOverpassData();
  const campusBoundaryElements = osm.elements.filter(
    (element) =>
      element.type === "relation" && element.tags?.amenity === "university",
  );
  const campusPolygons = campusBoundaryElements.flatMap(relationPolygonRings);
  if (campusPolygons.length === 0) {
    throw new Error("The NTHU campus boundary was missing from Overpass data");
  }
  const primaryCampusPolygon = [...campusPolygons].sort(
    (left, right) => osmPolygonArea(right) - osmPolygonArea(left),
  )[0]!;
  const sourceBuildings = osm.elements
    .filter((element) => Boolean(element.tags?.building))
    .flatMap(createBuildingParts);
  const lines = osm.elements.flatMap((element) =>
    createLinearFeatures(element, [primaryCampusPolygon]),
  );
  const sourceWater = osm.elements
    .filter(
      (element) =>
        element.tags?.natural === "water" ||
        element.tags?.waterway === "riverbank",
    )
    .flatMap((element) => createAreaParts(element, "water"));
  const compactedCuration = compactCampusMapLabelCatalog(curation);
  const syncedCuration = process.argv.includes("--sync-labels")
    ? syncCampusMapLabelCatalog(sourceBuildings, sourceWater, compactedCuration)
    : compactedCuration;
  if (JSON.stringify(syncedCuration) !== JSON.stringify(curation)) {
    await writeCampusMapCuration(CURATION_PATH, syncedCuration);
  }
  const { buildings, water } = applyCampusMapCuration(
    sourceBuildings,
    sourceWater,
    syncedCuration,
  );
  const boundaries = campusBoundaryElements
    .flatMap((element) => createAreaParts(element, "boundary"))
    .sort((a, b) => polygonArea(b) - polygonArea(a));
  const illustrativeVegetationAreas = createIllustrativeVegetationAreas(
    syncedCuration,
    [primaryCampusPolygon],
  );
  const areas = applyCampusEnvironmentCuration(
    [
      ...createEnvironmentAreas(osm.elements, campusPolygons),
      ...illustrativeVegetationAreas,
    ],
    syncedCuration,
  );
  const osmTrees = createTrees(osm.elements, campusPolygons);
  const illustrativeTrees = createIllustrativeTrees(
    syncedCuration,
    campusPolygons,
  );
  const trees = [...osmTrees, ...illustrativeTrees];
  const includedIndividualTrees = osm.elements.filter(
    (element) =>
      element.type === "node" &&
      element.tags?.natural === "tree" &&
      element.lat !== undefined &&
      element.lon !== undefined &&
      pointInsideCampus({ lat: element.lat, lon: element.lon }, campusPolygons),
  ).length;
  const includedTreeRows = countIncludedTreeRows(osm.elements, campusPolygons);

  const data: CampusMapData = {
    version: 1,
    generatedAt: osm.osm3s?.timestamp_osm_base ?? new Date().toISOString(),
    origin: NTHU_MAIN_CAMPUS_ORIGIN,
    bounds,
    attribution: {
      text: "© OpenStreetMap contributors",
      url: "https://www.openstreetmap.org/copyright",
      license: "ODbL 1.0",
    },
    buildings,
    roads: lines.filter((feature) => feature.kind === "road"),
    paths: lines.filter((feature) => feature.kind === "path"),
    water,
    areas,
    trees,
    boundary: boundaries[0],
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await Bun.write(OUTPUT_PATH, `${JSON.stringify(data)}\n`);
  console.log(
    `Generated ${OUTPUT_PATH}\n` +
      `${data.buildings.length} building parts, ${data.roads.length} roads, ` +
      `${data.paths.length} paths, ${data.water.length} water areas, ` +
      `${data.buildings.filter((building) => building.identityId).length} recognized CourseWeb building parts.\n` +
      `${areas.filter((area) => area.kind === "grass").length} grass, ` +
      `${areas.filter((area) => area.kind === "park").length} park, ` +
      `${areas.filter((area) => area.kind === "wood").length} wood, ` +
      `${areas.filter((area) => area.kind === "sports-pitch").length} sports pitch, ` +
      `${areas.filter((area) => area.kind === "athletics-track").length} track, ` +
      `${areas.filter((area) => area.kind === "parking").length} parking areas.\n` +
      `${trees.length} rendered trees from ${includedIndividualTrees} individual tree nodes, ${includedTreeRows} tree rows, and ${illustrativeTrees.length} illustrative curation points.\n` +
      `Curation excluded ${sourceBuildings.length - buildings.length} building parts, ` +
      `with ${syncedCuration.groups.length} label groups and ${Object.keys(syncedCuration.renamed).length} name overrides.`,
  );
}

await main();
