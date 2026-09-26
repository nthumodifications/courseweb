import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
} from "three";
import {
  geoToWorld,
  type CampusBuilding,
  type GeoCoordinate,
  type LatLon,
} from "@courseweb/shared";
import {
  getBuildingModelParts,
  getBuildingModelProfile,
} from "./buildingModels";
import {
  CAMPUS_BUILDING_COLORS,
  getBuildingColorCategory,
  getBuildingHeight,
  getCampusFeatureLabelKey,
} from "./sceneLogic";

// Small spatial batches retain frustum culling without a draw call per building.
export const BUILDING_TILE_SIZE = 220;

type Point = { x: number; z: number };
type Vertex = [x: number, y: number, z: number];
type FaceRange = { end: number; building: CampusBuilding };
export type BuildingTile = {
  key: string;
  geometry: BufferGeometry;
  faces: FaceRange[];
};
export type CampusBuildingModel = {
  tiles: BuildingTile[];
  selectionIds: Map<string, number>;
};

function ringArea(points: Point[]): number {
  return (
    points.reduce((area, p, i) => {
      const next = points[(i + 1) % points.length];
      return area + p.x * next.z - next.x * p.z;
    }, 0) / 2
  );
}

function worldRing(
  ring: GeoCoordinate[],
  origin: LatLon,
  hole: boolean,
): Point[] {
  const points: Point[] = [];
  for (const [lon, lat] of ring) {
    const point = geoToWorld({ lat, lon }, origin);
    const previous = points.at(-1);
    if (
      !previous ||
      Math.hypot(point.x - previous.x, point.z - previous.z) > 0.01
    ) {
      points.push(point);
    }
  }
  if (points.length > 1) {
    const first = points[0];
    const last = points.at(-1)!;
    if (Math.hypot(first.x - last.x, first.z - last.z) < 0.01) points.pop();
  }
  if (ringArea(points) > 0 === hole) points.reverse();
  return points;
}

/** A bounded inward miter gives roof rims depth without extending the footprint. */
function insetRing(ring: Point[], width: number): Point[] {
  return ring.map((point, i) => {
    const previous = ring[(i + ring.length - 1) % ring.length];
    const next = ring[(i + 1) % ring.length];
    const a = new Vector2(
      point.x - previous.x,
      point.z - previous.z,
    ).normalize();
    const b = new Vector2(next.x - point.x, next.z - point.z).normalize();
    const normal = new Vector2(-a.y - b.y, a.x + b.x).normalize();
    const distance = Math.min(
      width / Math.max(normal.dot(new Vector2(-b.y, b.x)), 0.3),
      width * 2,
    );
    return {
      x: point.x + normal.x * distance,
      z: point.z + normal.y * distance,
    };
  });
}

function createTile(
  key: string,
  buildings: CampusBuilding[],
  origin: LatLon,
  selectionIds: Map<string, number>,
): BuildingTile {
  const positions: number[] = [];
  const colors: number[] = [];
  const facades: number[] = [];
  const styles: number[] = [];
  const ids: number[] = [];
  const faces: FaceRange[] = [];
  let selectionId = 0;

  function triangle(
    vertices: Vertex[],
    color: Color,
    uv: [number, number][] = [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    width = 0,
    levels = 0,
    style = 0,
  ) {
    vertices.forEach((vertex, i) => {
      positions.push(...vertex);
      colors.push(color.r, color.g, color.b);
      facades.push(uv[i][0], uv[i][1], width, levels);
      styles.push(style);
      ids.push(selectionId);
    });
  }

  function quad(
    a: Vertex,
    b: Vertex,
    c: Vertex,
    d: Vertex,
    color: Color,
    width = 0,
    levels = 0,
    style = 0,
  ) {
    triangle(
      [a, b, c],
      color,
      [
        [0, 0],
        [width, 0],
        [width, levels],
      ],
      width,
      levels,
      style,
    );
    triangle(
      [a, c, d],
      color,
      [
        [0, 0],
        [width, levels],
        [0, levels],
      ],
      width,
      levels,
      style,
    );
  }

  for (const building of buildings) {
    selectionId = selectionIds.get(getCampusFeatureLabelKey(building))!;
    const profile = getBuildingModelProfile(building);
    const category = new Color(
      CAMPUS_BUILDING_COLORS[getBuildingColorCategory(building)],
    );
    const wall = profile
      ? new Color(profile.wall)
      : category.clone().lerp(new Color("#d8d2c5"), 0.48);
    const roof = category.clone().lerp(new Color("#a9a99e"), 0.55);
    const coping = wall.clone().lerp(new Color("#eee9df"), 0.35);
    const innerWall = coping.clone().multiplyScalar(0.76);

    for (const part of getBuildingModelParts(
      building,
      getBuildingHeight(building),
    )) {
      const outer = worldRing(part.footprint, origin, false);
      if (outer.length < 3 || Math.abs(ringArea(outer)) < 0.1) continue;
      const holes = (part.holes ?? [])
        .map((ring) => worldRing(ring, origin, true))
        .filter((ring) => ring.length >= 3);
      const points = [outer, ...holes].flat();
      const roofHeight = part.height - Math.min(0.55, part.height * 0.04);
      const roofFaces = ShapeUtils.triangulateShape(
        outer.map((p) => new Vector2(p.x, p.z)),
        holes.map((ring) => ring.map((p) => new Vector2(p.x, p.z))),
      );
      for (const face of roofFaces) {
        const p = face.map((index) => points[index]);
        if (ringArea(p) > 0) p.reverse();
        triangle(
          p.map((v) => [v.x, roofHeight, v.z]),
          roof,
        );
      }

      for (const ring of [outer, ...holes]) {
        const inset = insetRing(ring, 0.32);
        ring.forEach((a, i) => {
          const next = (i + 1) % ring.length;
          const b = ring[next];
          const ai = inset[i];
          const bi = inset[next];
          const length = Math.hypot(b.x - a.x, b.z - a.z);
          let style = { plain: 0, windows: 1, bands: 2, glass: 3 }[part.facade];
          // Delta's south-facing red entrance frame and Engineering I's pale
          // vertical bays are stylized from official reference photographs.
          if (
            profile?.landmark === "delta" &&
            (a.x - b.x) / length > 0.8 &&
            length > 25
          )
            style = 4;
          if (profile?.landmark === "engineering" && length > 25) style = 5;
          quad(
            [a.x, 0, a.z],
            [a.x, part.height, a.z],
            [b.x, part.height, b.z],
            [b.x, 0, b.z],
            wall,
          );
          // The winding above faces outwards; supply wall-local UVs explicitly.
          const start = facades.length - 24;
          const u = length / 3.2;
          const uv = [
            [0, 0],
            [0, part.levels],
            [u, part.levels],
            [0, 0],
            [u, part.levels],
            [u, 0],
          ];
          uv.forEach(([x, y], j) => {
            facades.splice(start + j * 4, 4, x, y, u, part.levels);
            styles[styles.length - 6 + j] = style;
          });
          // Roof coping and its inward face, including around courtyard holes.
          quad(
            [a.x, part.height, a.z],
            [ai.x, part.height, ai.z],
            [bi.x, part.height, bi.z],
            [b.x, part.height, b.z],
            coping,
          );
          quad(
            [bi.x, roofHeight, bi.z],
            [bi.x, part.height, bi.z],
            [ai.x, part.height, ai.z],
            [ai.x, roofHeight, ai.z],
            innerWall,
          );
        });
      }
    }
    faces.push({ end: positions.length / 9, building });
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute("facade", new Float32BufferAttribute(facades, 4));
  geometry.setAttribute("facadeStyle", new Float32BufferAttribute(styles, 1));
  geometry.setAttribute("buildingId", new Float32BufferAttribute(ids, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { key, geometry, faces };
}

export function createCampusBuildingModel(
  buildings: CampusBuilding[],
  origin: LatLon,
): CampusBuildingModel {
  const groups = new Map<string, CampusBuilding[]>();
  const selectionIds = new Map<string, number>();
  for (const building of buildings) {
    const label = getCampusFeatureLabelKey(building);
    if (!selectionIds.has(label))
      selectionIds.set(label, selectionIds.size + 1);
    const { x, z } = geoToWorld(building.location, origin);
    const key = `${Math.floor(x / BUILDING_TILE_SIZE)},${Math.floor(z / BUILDING_TILE_SIZE)}`;
    const group = groups.get(key) ?? [];
    group.push(building);
    groups.set(key, group);
  }
  return {
    tiles: Array.from(groups, ([key, group]) =>
      createTile(key, group, origin, selectionIds),
    ),
    selectionIds,
  };
}

export function findBuildingAtFace(
  tile: BuildingTile,
  faceIndex: number | undefined | null,
): CampusBuilding | undefined {
  if (faceIndex == null || faceIndex < 0 || !Number.isInteger(faceIndex))
    return;
  return tile.faces.find((range) => faceIndex < range.end)?.building;
}
