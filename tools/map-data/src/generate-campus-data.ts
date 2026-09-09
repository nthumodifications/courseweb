import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  findCampusIdentityForOsmFeature,
  NTHU_MAIN_CAMPUS_ORIGIN,
  type CampusAreaFeature,
  type CampusBuilding,
  type CampusLinearFeature,
  type CampusMapData,
  type GeoCoordinate,
} from "../../../packages/shared/src/campus";
import {
  applyCampusMapCuration,
  loadCampusMapCuration,
  syncCampusMapLabelCatalog,
  writeCampusMapCuration,
} from "./curation";

const OVERPASS_ENDPOINTS = [
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

type OsmPoint = { lat: number; lon: number };
type OsmTags = Record<string, string>;
type OsmMember = {
  type: "way" | "node" | "relation";
  ref: number;
  role?: string;
  geometry?: OsmPoint[];
};
type OsmElement = {
  type: "way" | "node" | "relation";
  id: number;
  tags?: OsmTags;
  geometry?: OsmPoint[];
  members?: OsmMember[];
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
  relation["amenity"="university"]["name"~"清華|Tsing Hua"](${bbox});
);
out body geom;`;

function roundCoordinate(value: number): number {
  return Number(value.toFixed(7));
}

function toCoordinate(point: OsmPoint): GeoCoordinate {
  return [roundCoordinate(point.lon), roundCoordinate(point.lat)];
}

function samePoint(a: OsmPoint, b: OsmPoint): boolean {
  return a.lat === b.lat && a.lon === b.lon;
}

function closeRing(points: OsmPoint[]): OsmPoint[] | undefined {
  if (points.length < 3) return undefined;
  return samePoint(points[0], points.at(-1)!) ? points : [...points, points[0]];
}

function stitchRings(segments: OsmPoint[][]): OsmPoint[][] {
  const remaining = segments
    .filter((segment) => segment.length >= 2)
    .map((segment) => [...segment]);
  const rings: OsmPoint[][] = [];

  while (remaining.length > 0) {
    const ring = remaining.shift()!;
    let madeProgress = true;

    while (!samePoint(ring[0], ring.at(-1)!) && madeProgress) {
      madeProgress = false;
      const tail = ring.at(-1)!;
      const index = remaining.findIndex(
        (segment) =>
          samePoint(segment[0], tail) || samePoint(segment.at(-1)!, tail),
      );
      if (index >= 0) {
        const [next] = remaining.splice(index, 1);
        if (samePoint(next.at(-1)!, tail)) next.reverse();
        ring.push(...next.slice(1));
        madeProgress = true;
      }
    }

    const closed = closeRing(ring);
    if (closed) rings.push(closed);
  }

  return rings;
}

type OsmPolygonRings = {
  outer: OsmPoint[];
  holes: OsmPoint[][];
};

function pointInRing(point: OsmPoint, ring: OsmPoint[]): boolean {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    index += 1
  ) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    const crossesLatitude =
      currentPoint.lat > point.lat !== previousPoint.lat > point.lat;
    const longitudeAtLatitude =
      ((previousPoint.lon - currentPoint.lon) *
        (point.lat - currentPoint.lat)) /
        (previousPoint.lat - currentPoint.lat) +
      currentPoint.lon;
    if (crossesLatitude && point.lon < longitudeAtLatitude) inside = !inside;
    previous = index;
  }
  return inside;
}

function relationPolygonRings(element: OsmElement): OsmPolygonRings[] {
  const members = element.members ?? [];
  const polygons = stitchRings(
    members
      .filter((member) => (member.role ?? "outer") === "outer")
      .map((member) => member.geometry ?? []),
  ).map((outer) => ({ outer, holes: [] }));
  const innerRings = stitchRings(
    members
      .filter((member) => member.role === "inner")
      .map((member) => member.geometry ?? []),
  );

  for (const hole of innerRings) {
    const containingPolygon = polygons.find(({ outer }) =>
      pointInRing(hole[0], outer),
    );
    containingPolygon?.holes.push(hole);
  }

  return polygons;
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

function createLinearFeature(
  element: OsmElement,
): CampusLinearFeature | undefined {
  const highway = element.tags?.highway;
  if (!highway || !element.geometry || element.geometry.length < 2)
    return undefined;
  const kind = ["footway", "path", "steps", "pedestrian"].includes(highway)
    ? "path"
    : "road";
  return {
    id: `osm-way-${element.id}`,
    kind,
    points: element.geometry.map(toCoordinate),
    width: roadWidth(highway),
  };
}

function createAreaParts(
  element: OsmElement,
  kind: CampusAreaFeature["kind"],
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
      names,
      location: polygonCenter(polygon),
      polygon,
      ...(holes.length > 0
        ? { holes: holes.map((ring) => ring.map(toCoordinate)) }
        : {}),
    };
  });
}

function polygonArea(feature: CampusAreaFeature): number {
  return Math.abs(
    feature.polygon.reduce((area, point, index, points) => {
      const next = points[(index + 1) % points.length];
      return area + point[0] * next[1] - next[0] * point[1];
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
  const sourceBuildings = osm.elements
    .filter((element) => Boolean(element.tags?.building))
    .flatMap(createBuildingParts);
  const lines = osm.elements
    .map(createLinearFeature)
    .filter((feature): feature is CampusLinearFeature => Boolean(feature));
  const sourceWater = osm.elements
    .filter(
      (element) =>
        element.tags?.natural === "water" ||
        element.tags?.waterway === "riverbank",
    )
    .flatMap((element) => createAreaParts(element, "water"));
  const curationBeforeSync = process.argv.includes("--reset-labels")
    ? { ...curation, labels: [] }
    : curation;
  const syncedCuration = process.argv.includes("--sync-labels")
    ? syncCampusMapLabelCatalog(
        sourceBuildings,
        sourceWater,
        curationBeforeSync,
      )
    : curation;
  if (syncedCuration !== curation) {
    await writeCampusMapCuration(CURATION_PATH, syncedCuration);
  }
  const { buildings, water } = applyCampusMapCuration(
    sourceBuildings,
    sourceWater,
    syncedCuration,
  );
  const boundaries = osm.elements
    .filter(
      (element) =>
        element.type === "relation" && element.tags?.amenity === "university",
    )
    .flatMap((element) => createAreaParts(element, "boundary"))
    .sort((a, b) => polygonArea(b) - polygonArea(a));

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
    boundary: boundaries[0],
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await Bun.write(OUTPUT_PATH, `${JSON.stringify(data)}\n`);
  console.log(
    `Generated ${OUTPUT_PATH}\n` +
      `${data.buildings.length} building parts, ${data.roads.length} roads, ` +
      `${data.paths.length} paths, ${data.water.length} water areas, ` +
      `${data.buildings.filter((building) => building.identityId).length} recognized CourseWeb building parts.\n` +
      `Curation excluded ${sourceBuildings.length - buildings.length} building parts, ` +
      `with ${syncedCuration.groups.length} label groups and ${Object.keys(syncedCuration.renamed).length} name overrides.`,
  );
}

await main();
