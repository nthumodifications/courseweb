import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  ShapeGeometry,
} from "three";
import {
  geoToWorld,
  type CampusAreaFeature,
  type CampusBuilding,
  type CampusLinearFeature,
  type GeoCoordinate,
  type LatLon,
} from "@courseweb/shared";
import { getBuildingHeight } from "./sceneLogic";

function coordinateToWorld(
  [lon, lat]: GeoCoordinate,
  origin: LatLon,
): { x: number; z: number } {
  return geoToWorld({ lat, lon }, origin);
}

function addRingToPath(
  path: Shape | Path,
  points: GeoCoordinate[],
  origin: LatLon,
): void {
  points.forEach((point, index) => {
    const world = coordinateToWorld(point, origin);
    if (index === 0) path.moveTo(world.x, -world.z);
    else path.lineTo(world.x, -world.z);
  });
}

function createShape(
  points: GeoCoordinate[],
  origin: LatLon,
  holes: GeoCoordinate[][] = [],
): Shape {
  const shape = new Shape();
  addRingToPath(shape, points, origin);
  shape.holes = holes.map((points) => {
    const hole = new Path();
    addRingToPath(hole, points, origin);
    return hole;
  });
  return shape;
}

export function createBuildingGeometry(
  building: CampusBuilding,
  origin: LatLon,
): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(
    createShape(building.geometry.footprint, origin, building.geometry.holes),
    {
      depth: getBuildingHeight(building),
      bevelEnabled: false,
      curveSegments: 1,
    },
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingSphere();
  return geometry;
}

export function createAreaGeometry(
  areas: CampusAreaFeature[],
  origin: LatLon,
): ShapeGeometry {
  const geometry = new ShapeGeometry(
    areas.map((area) => createShape(area.polygon, origin, area.holes)),
    1,
  );
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

type RibbonPoint = { x: number; z: number };

function sameRibbonPoint(left: RibbonPoint, right: RibbonPoint): boolean {
  return Math.hypot(right.x - left.x, right.z - left.z) < 0.05;
}

function ribbonOffset(
  points: RibbonPoint[],
  index: number,
  halfWidth: number,
): RibbonPoint {
  const previous = points[Math.max(0, index - 1)];
  const current = points[index];
  const next = points[Math.min(points.length - 1, index + 1)];
  const previousLength = Math.hypot(
    current.x - previous.x,
    current.z - previous.z,
  );
  const nextLength = Math.hypot(next.x - current.x, next.z - current.z);

  const previousNormal =
    previousLength > 0
      ? {
          x: -(current.z - previous.z) / previousLength,
          z: (current.x - previous.x) / previousLength,
        }
      : undefined;
  const nextNormal =
    nextLength > 0
      ? {
          x: -(next.z - current.z) / nextLength,
          z: (next.x - current.x) / nextLength,
        }
      : undefined;
  const fallback = nextNormal ?? previousNormal ?? { x: 0, z: 0 };
  if (!previousNormal || !nextNormal) {
    return { x: fallback.x * halfWidth, z: fallback.z * halfWidth };
  }

  const miterX = previousNormal.x + nextNormal.x;
  const miterZ = previousNormal.z + nextNormal.z;
  const miterLength = Math.hypot(miterX, miterZ);
  if (miterLength < 1e-6) {
    return { x: fallback.x * halfWidth, z: fallback.z * halfWidth };
  }

  const normalizedMiter = { x: miterX / miterLength, z: miterZ / miterLength };
  const alignment = Math.abs(
    normalizedMiter.x * nextNormal.x + normalizedMiter.z * nextNormal.z,
  );
  const length = Math.min(
    halfWidth / Math.max(alignment, 0.35),
    halfWidth * 2.5,
  );
  return { x: normalizedMiter.x * length, z: normalizedMiter.z * length };
}

/** Builds continuous feature ribbons into one triangle mesh to keep draw calls low. */
export function createRibbonGeometry(
  features: CampusLinearFeature[],
  origin: LatLon,
  widthOffset = 0,
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  features.forEach((feature) => {
    const points = feature.points
      .map((point) => coordinateToWorld(point, origin))
      .filter(
        (point, index, allPoints) =>
          index === 0 || !sameRibbonPoint(allPoints[index - 1], point),
      );
    if (points.length < 2) return;

    const halfWidth = Math.max(0, feature.width + widthOffset) / 2;
    const base = positions.length / 3;
    points.forEach((point, index) => {
      const offset = ribbonOffset(points, index, halfWidth);
      positions.push(
        point.x + offset.x,
        0,
        point.z + offset.z,
        point.x - offset.x,
        0,
        point.z - offset.z,
      );
      if (index === 0) return;
      const previousLeft = base + (index - 1) * 2;
      const previousRight = previousLeft + 1;
      const currentLeft = base + index * 2;
      const currentRight = currentLeft + 1;
      indices.push(
        previousLeft,
        currentLeft,
        previousRight,
        currentLeft,
        currentRight,
        previousRight,
      );
    });
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
