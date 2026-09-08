import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  findCampusIdentityForOsmFeature,
  isGeoCoordinateInPolygon,
  NTHU_MAIN_CAMPUS_ORIGIN,
  type CampusAreaFeature,
  type CampusBuilding,
  type CampusLinearFeature,
  type CampusMapData,
  type GeoCoordinate,
} from "../../../packages/shared/src/campus";

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const NTHU_MAIN_CAMPUS_RELATION_ID = 3_605_515;
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
  relation(${NTHU_MAIN_CAMPUS_RELATION_ID});
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

function relationOuterRings(element: OsmElement): OsmPoint[][] {
  return stitchRings(
    (element.members ?? [])
      .filter((member) => (member.role ?? "outer") === "outer")
      .map((member) => member.geometry ?? []),
  );
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
  const rawRings =
    element.type === "relation"
      ? relationOuterRings(element)
      : element.geometry
        ? [closeRing(element.geometry)].filter((ring): ring is OsmPoint[] =>
            Boolean(ring),
          )
        : [];
  const identity =
    element.type === "way" || element.type === "relation"
      ? findCampusIdentityForOsmFeature(
          element.type,
          element.id,
          namesFromTags(tags),
        )
      : undefined;

  return rawRings.map((ring, partIndex) => {
    const footprint = ring.map(toCoordinate);
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
  const rings =
    element.type === "relation"
      ? relationOuterRings(element)
      : element.geometry
        ? [closeRing(element.geometry)].filter((ring): ring is OsmPoint[] =>
            Boolean(ring),
          )
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

  return rings.map((ring, index) => {
    const polygon = ring.map(toCoordinate);
    return {
      id: `osm-${element.type}-${element.id}-${index}`,
      kind,
      names,
      location: polygonCenter(polygon),
      polygon,
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
  const osm = await fetchOverpassData();
  const candidateBuildings = osm.elements
    .filter((element) => Boolean(element.tags?.building))
    .flatMap(createBuildingParts);
  const lines = osm.elements
    .map(createLinearFeature)
    .filter((feature): feature is CampusLinearFeature => Boolean(feature));
  const candidateWater = osm.elements
    .filter(
      (element) =>
        element.tags?.natural === "water" ||
        element.tags?.waterway === "riverbank",
    )
    .flatMap((element) => createAreaParts(element, "water"));
  const boundaries = osm.elements
    .filter(
      (element) =>
        element.type === "relation" &&
        element.id === NTHU_MAIN_CAMPUS_RELATION_ID,
    )
    .flatMap((element) => createAreaParts(element, "boundary"))
    .sort((a, b) => polygonArea(b) - polygonArea(a));
  const boundary = boundaries[0];
  if (!boundary) {
    throw new Error("NTHU main campus boundary was not returned by Overpass");
  }

  const isInsideCampus = ({ lat, lon }: { lat: number; lon: number }) =>
    boundaries.some((part) =>
      isGeoCoordinateInPolygon([lon, lat], part.polygon),
    );
  const buildings = candidateBuildings.filter((building) =>
    isInsideCampus(building.location),
  );
  const water = candidateWater.filter((area) => isInsideCampus(area.location));

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
    boundary,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await Bun.write(OUTPUT_PATH, `${JSON.stringify(data)}\n`);
  console.log(
    `Generated ${OUTPUT_PATH}\n` +
      `${data.buildings.length} building parts, ${data.roads.length} roads, ` +
      `${data.paths.length} paths, ${data.water.length} water areas, ` +
      `${data.buildings.filter((building) => building.identityId).length} recognized CourseWeb building parts.\n` +
      `Used ${boundaries.length} NTHU boundary polygon parts. ` +
      `Excluded ${candidateBuildings.length - buildings.length} off-campus building parts and ` +
      `${candidateWater.length - water.length} off-campus water areas.`,
  );
}

await main();
