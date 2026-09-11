import type {
  CampusAreaKind,
  LatLon,
} from "../../../packages/shared/src/campus";

export type OsmPoint = { lat: number; lon: number };
export type OsmTags = Record<string, string>;
export type OsmMember = {
  type: "way" | "node" | "relation";
  ref: number;
  role?: string;
  geometry?: OsmPoint[];
};
export type OsmElement = {
  type: "way" | "node" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: OsmTags;
  geometry?: OsmPoint[];
  members?: OsmMember[];
};

export type OsmPolygonRings = {
  outer: OsmPoint[];
  holes: OsmPoint[][];
};

export type EnvironmentAreaClassification = {
  kind: Exclude<CampusAreaKind, "water" | "boundary">;
  sport?: string;
};

export function classifyEnvironmentArea(
  tags: OsmTags,
): EnvironmentAreaClassification | undefined {
  if (tags.leisure === "pitch") {
    return {
      kind: "sports-pitch",
      ...(tags.sport ? { sport: tags.sport } : {}),
    };
  }
  if (tags.leisure === "track") {
    return {
      kind: "athletics-track",
      ...(tags.sport ? { sport: tags.sport } : {}),
    };
  }
  if (tags.landuse === "grass" || tags.landuse === "recreation_ground") {
    return { kind: "grass" };
  }
  if (tags.leisure === "park") return { kind: "park" };
  if (tags.natural === "wood" || tags.landuse === "forest") {
    return { kind: "wood" };
  }
  if (tags.amenity === "parking") return { kind: "parking" };
  return undefined;
}

export function samePoint(a: OsmPoint, b: OsmPoint): boolean {
  return a.lat === b.lat && a.lon === b.lon;
}

export function closeRing(points: OsmPoint[]): OsmPoint[] | undefined {
  if (points.length < 3) return undefined;
  return samePoint(points[0], points.at(-1)!) ? points : [...points, points[0]];
}

export function stitchRings(segments: OsmPoint[][]): OsmPoint[][] {
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

export function pointInRing(point: OsmPoint, ring: OsmPoint[]): boolean {
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

export function relationPolygonRings(element: OsmElement): OsmPolygonRings[] {
  const members = element.members ?? [];
  const polygons = stitchRings(
    members
      .filter((member) => (member.role ?? "outer") === "outer")
      .map((member) => member.geometry ?? []),
  ).map((outer) => ({ outer, holes: [] as OsmPoint[][] }));
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

export function pointInPolygons(
  point: OsmPoint,
  polygons: OsmPolygonRings[],
): boolean {
  return polygons.some(
    ({ outer, holes }) =>
      pointInRing(point, outer) &&
      !holes.some((hole) => pointInRing(point, hole)),
  );
}

const GEOMETRY_EPSILON = 1e-10;

function crossProduct(
  leftX: number,
  leftY: number,
  rightX: number,
  rightY: number,
): number {
  return leftX * rightY - leftY * rightX;
}

function pointOnSegment(
  point: OsmPoint,
  start: OsmPoint,
  end: OsmPoint,
): boolean {
  const segmentLon = end.lon - start.lon;
  const segmentLat = end.lat - start.lat;
  const pointLon = point.lon - start.lon;
  const pointLat = point.lat - start.lat;
  if (
    Math.abs(crossProduct(segmentLon, segmentLat, pointLon, pointLat)) >
    GEOMETRY_EPSILON
  ) {
    return false;
  }
  const dot = pointLon * segmentLon + pointLat * segmentLat;
  const squaredLength = segmentLon ** 2 + segmentLat ** 2;
  return dot >= -GEOMETRY_EPSILON && dot <= squaredLength + GEOMETRY_EPSILON;
}

function pointOnRing(point: OsmPoint, ring: OsmPoint[]): boolean {
  return ring
    .slice(0, -1)
    .some((start, index) => pointOnSegment(point, start, ring[index + 1]));
}

function pointInsideOrOnPolygons(
  point: OsmPoint,
  polygons: OsmPolygonRings[],
): boolean {
  return polygons.some(
    ({ outer, holes }) =>
      (pointInRing(point, outer) || pointOnRing(point, outer)) &&
      !holes.some(
        (hole) => pointInRing(point, hole) && !pointOnRing(point, hole),
      ),
  );
}

function segmentIntersectionParameters(
  start: OsmPoint,
  end: OsmPoint,
  edgeStart: OsmPoint,
  edgeEnd: OsmPoint,
): number[] {
  const segmentLon = end.lon - start.lon;
  const segmentLat = end.lat - start.lat;
  const edgeLon = edgeEnd.lon - edgeStart.lon;
  const edgeLat = edgeEnd.lat - edgeStart.lat;
  const denominator = crossProduct(segmentLon, segmentLat, edgeLon, edgeLat);
  const offsetLon = edgeStart.lon - start.lon;
  const offsetLat = edgeStart.lat - start.lat;
  if (Math.abs(denominator) <= GEOMETRY_EPSILON) {
    if (
      Math.abs(crossProduct(offsetLon, offsetLat, segmentLon, segmentLat)) >
      GEOMETRY_EPSILON
    ) {
      return [];
    }
    const squaredLength = segmentLon ** 2 + segmentLat ** 2;
    if (squaredLength <= GEOMETRY_EPSILON) return [];
    return [edgeStart, edgeEnd]
      .map(
        (point) =>
          ((point.lon - start.lon) * segmentLon +
            (point.lat - start.lat) * segmentLat) /
          squaredLength,
      )
      .filter(
        (ratio) => ratio >= -GEOMETRY_EPSILON && ratio <= 1 + GEOMETRY_EPSILON,
      )
      .map((ratio) => Math.min(1, Math.max(0, ratio)));
  }

  const segmentRatio =
    crossProduct(offsetLon, offsetLat, edgeLon, edgeLat) / denominator;
  const edgeRatio =
    crossProduct(offsetLon, offsetLat, segmentLon, segmentLat) / denominator;
  if (
    segmentRatio < -GEOMETRY_EPSILON ||
    segmentRatio > 1 + GEOMETRY_EPSILON ||
    edgeRatio < -GEOMETRY_EPSILON ||
    edgeRatio > 1 + GEOMETRY_EPSILON
  ) {
    return [];
  }
  return [Math.min(1, Math.max(0, segmentRatio))];
}

function interpolatePoint(
  start: OsmPoint,
  end: OsmPoint,
  ratio: number,
): OsmPoint {
  return {
    lat: start.lat + (end.lat - start.lat) * ratio,
    lon: start.lon + (end.lon - start.lon) * ratio,
  };
}

function sameApproximatePoint(left: OsmPoint, right: OsmPoint): boolean {
  return (
    Math.abs(left.lat - right.lat) <= GEOMETRY_EPSILON &&
    Math.abs(left.lon - right.lon) <= GEOMETRY_EPSILON
  );
}

function clipSegmentToPolygons(
  start: OsmPoint,
  end: OsmPoint,
  polygons: OsmPolygonRings[],
): Array<[OsmPoint, OsmPoint]> {
  const ratios = [0, 1];
  for (const { outer, holes } of polygons) {
    for (const ring of [outer, ...holes]) {
      for (let index = 0; index < ring.length - 1; index += 1) {
        ratios.push(
          ...segmentIntersectionParameters(
            start,
            end,
            ring[index],
            ring[index + 1],
          ),
        );
      }
    }
  }

  const sortedRatios = ratios
    .sort((left, right) => left - right)
    .filter(
      (ratio, index, values) =>
        index === 0 || Math.abs(ratio - values[index - 1]) > GEOMETRY_EPSILON,
    );
  return sortedRatios.slice(0, -1).flatMap((startRatio, index) => {
    const endRatio = sortedRatios[index + 1];
    if (endRatio - startRatio <= GEOMETRY_EPSILON) return [];
    const midpoint = interpolatePoint(start, end, (startRatio + endRatio) / 2);
    return pointInsideOrOnPolygons(midpoint, polygons)
      ? [
          [
            interpolatePoint(start, end, startRatio),
            interpolatePoint(start, end, endRatio),
          ] as [OsmPoint, OsmPoint],
        ]
      : [];
  });
}

/** Clips a polyline to polygon boundaries, splitting it on exits and re-entry. */
export function clipPolylineToPolygons(
  points: OsmPoint[],
  polygons: OsmPolygonRings[],
): OsmPoint[][] {
  const parts: OsmPoint[][] = [];
  let current: OsmPoint[] | undefined;

  for (let index = 0; index < points.length - 1; index += 1) {
    const clippedSegments = clipSegmentToPolygons(
      points[index],
      points[index + 1],
      polygons,
    );
    if (clippedSegments.length === 0) {
      if (current && current.length >= 2) parts.push(current);
      current = undefined;
      continue;
    }

    for (const [start, end] of clippedSegments) {
      if (!current || !sameApproximatePoint(current.at(-1)!, start)) {
        if (current && current.length >= 2) parts.push(current);
        current = [start, end];
      } else if (!sameApproximatePoint(current.at(-1)!, end)) {
        current.push(end);
      }
    }

    if (!sameApproximatePoint(clippedSegments.at(-1)![1], points[index + 1])) {
      if (current && current.length >= 2) parts.push(current);
      current = undefined;
    }
  }
  if (current && current.length >= 2) parts.push(current);
  return parts;
}

function segmentLengthMeters(start: OsmPoint, end: OsmPoint): number {
  const latitudeRadians = ((start.lat + end.lat) / 2) * (Math.PI / 180);
  const north = (end.lat - start.lat) * 111_320;
  const east = (end.lon - start.lon) * 111_320 * Math.cos(latitudeRadians);
  return Math.hypot(east, north);
}

/** Produces stable, sparse positions without runtime randomness. */
export function sampleTreeRow(
  points: OsmPoint[],
  spacingMeters = 18,
): LatLon[] {
  if (points.length < 2 || spacingMeters <= 0) return [];
  const segments = points.slice(0, -1).map((start, index) => ({
    start,
    end: points[index + 1],
    length: segmentLengthMeters(start, points[index + 1]),
  }));
  const totalLength = segments.reduce(
    (sum, segment) => sum + segment.length,
    0,
  );
  if (totalLength === 0) return [];

  const count = Math.max(1, Math.floor(totalLength / spacingMeters));
  return Array.from({ length: count }, (_, index) => {
    const targetDistance = (totalLength * (index + 1)) / (count + 1);
    let traversed = 0;
    for (const segment of segments) {
      if (targetDistance <= traversed + segment.length) {
        const ratio = (targetDistance - traversed) / segment.length;
        return {
          lat:
            segment.start.lat + (segment.end.lat - segment.start.lat) * ratio,
          lon:
            segment.start.lon + (segment.end.lon - segment.start.lon) * ratio,
        };
      }
      traversed += segment.length;
    }
    const last = points.at(-1)!;
    return { lat: last.lat, lon: last.lon };
  });
}

export function extractTreeLocations(element: OsmElement): LatLon[] {
  if (
    element.type === "node" &&
    element.tags?.natural === "tree" &&
    element.lat !== undefined &&
    element.lon !== undefined
  ) {
    return [{ lat: element.lat, lon: element.lon }];
  }
  if (element.type === "way" && element.tags?.natural === "tree_row") {
    return sampleTreeRow(element.geometry ?? []);
  }
  return [];
}
