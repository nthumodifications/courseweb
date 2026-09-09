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

/** Builds all line segments into one triangle mesh to keep draw calls low. */
export function createRibbonGeometry(
  features: CampusLinearFeature[],
  origin: LatLon,
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  features.forEach((feature) => {
    for (let index = 0; index < feature.points.length - 1; index += 1) {
      const start = coordinateToWorld(feature.points[index], origin);
      const end = coordinateToWorld(feature.points[index + 1], origin);
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.05) continue;

      const halfWidth = feature.width / 2;
      const offsetX = (-dz / length) * halfWidth;
      const offsetZ = (dx / length) * halfWidth;
      const base = positions.length / 3;
      positions.push(
        start.x + offsetX,
        0,
        start.z + offsetZ,
        start.x - offsetX,
        0,
        start.z - offsetZ,
        end.x + offsetX,
        0,
        end.z + offsetZ,
        end.x - offsetX,
        0,
        end.z - offsetZ,
      );
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
