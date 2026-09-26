import { describe, expect, test } from "bun:test";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import {
  geoToWorld,
  type CampusBuilding,
  type CampusMapData,
} from "@courseweb/shared";
import rawCampus from "../../../public/data/nthu-main-campus.json";
import {
  createCampusBuildingModel,
  findBuildingAtFace,
} from "./buildingGeometry";
import { getBuildingModelParts } from "./buildingModels";
import { getBuildingHeight } from "./sceneLogic";

const campus = rawCampus as CampusMapData;
const origin = { lat: 24.79, lon: 120.99 };
const building: CampusBuilding = {
  id: "test-building",
  source: { type: "way", id: 1 },
  names: { zh: "測試館" },
  location: origin,
  geometry: {
    height: 20,
    levels: 5,
    footprint: [
      [120.99, 24.79],
      [120.9904, 24.79],
      [120.9904, 24.7904],
      [120.99, 24.7904],
      [120.99, 24.79],
    ],
    holes: [
      [
        [120.9901, 24.7901],
        [120.9903, 24.7901],
        [120.9903, 24.7903],
        [120.9901, 24.7903],
        [120.9901, 24.7901],
      ],
    ],
  },
};

function dispose(model: ReturnType<typeof createCampusBuildingModel>) {
  model.tiles.forEach((tile) => tile.geometry.dispose());
}

describe("batched campus buildings", () => {
  test("keeps courtyards open and roofs pickable with either ring winding", () => {
    for (const reverse of [false, true]) {
      const feature = {
        ...building,
        geometry: {
          ...building.geometry,
          footprint: reverse
            ? [...building.geometry.footprint].reverse()
            : building.geometry.footprint,
          holes: building.geometry.holes!.map((ring) =>
            reverse ? [...ring].reverse() : ring,
          ),
        },
      };
      const model = createCampusBuildingModel([feature], origin);
      const tile = model.tiles[0];
      const material = new MeshBasicMaterial();
      const mesh = new Mesh(tile.geometry, material);
      const ray = new Raycaster();
      const center = geoToWorld({ lat: 24.7902, lon: 120.9902 }, origin);
      ray.set(new Vector3(center.x, 50, center.z), new Vector3(0, -1, 0));
      expect(ray.intersectObject(mesh)).toHaveLength(0);
      const roof = geoToWorld({ lat: 24.79005, lon: 120.9902 }, origin);
      ray.set(new Vector3(roof.x, 50, roof.z), new Vector3(0, -1, 0));
      const hits = ray.intersectObject(mesh);
      expect(hits.length).toBeGreaterThan(0);
      expect(findBuildingAtFace(tile, hits[0].faceIndex)?.id).toBe(building.id);
      // The courtyard's inside walls must also face the empty courtyard.
      ray.set(new Vector3(center.x, 10, center.z), new Vector3(1, 0, 0));
      expect(ray.intersectObject(mesh).length).toBeGreaterThan(0);
      dispose(model);
      material.dispose();
    }
  });

  test("maps face ranges to the correct building and shares grouped highlighting", () => {
    const a = { ...building, labelGroupId: "group" };
    const b = { ...building, id: "second", labelGroupId: "group" };
    const model = createCampusBuildingModel([a, b], origin);
    expect(model.tiles).toHaveLength(1);
    const tile = model.tiles[0];
    expect(findBuildingAtFace(tile, 0)).toBe(a);
    expect(findBuildingAtFace(tile, tile.faces[0].end)).toBe(b);
    expect(findBuildingAtFace(tile, tile.faces[1].end)).toBeUndefined();
    expect(findBuildingAtFace(tile, -1)).toBeUndefined();
    expect(findBuildingAtFace(tile, undefined)).toBeUndefined();
    expect(model.selectionIds.size).toBe(1);
    expect(new Set(tile.geometry.getAttribute("buildingId").array).size).toBe(
      1,
    );
    dispose(model);
  });

  test("keeps all campus buildings within a mobile geometry and batch budget", () => {
    const model = createCampusBuildingModel(campus.buildings, campus.origin);
    expect(model.tiles.length).toBeLessThanOrEqual(40);
    expect(model.tiles.flatMap((tile) => tile.faces).length).toBe(
      campus.buildings.length,
    );
    let triangles = 0;
    let bytes = 0;
    for (const tile of model.tiles) {
      const position = tile.geometry.getAttribute("position");
      triangles += position.count / 3;
      expect(tile.geometry.groups).toHaveLength(0);
      for (const attribute of Object.values(tile.geometry.attributes)) {
        bytes += attribute.array.byteLength;
        expect(attribute.count).toBe(position.count);
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      }
    }
    expect(triangles).toBeLessThan(15_000);
    expect(bytes).toBeLessThan(3_000_000);
    dispose(model);
  });
});

describe("landmark proportions", () => {
  const mxic = campus.buildings.find((b) => b.identityId === "mxic")!;
  test("splits MXIC into four and seven storeys while preserving the outline area", () => {
    const parts = getBuildingModelParts(mxic, getBuildingHeight(mxic));
    expect(parts.map((part) => part.levels)).toEqual([7, 4]);
    expect(parts[1].height / parts[0].height).toBeCloseTo(4 / 7);
    const area = (ring: number[][]) =>
      Math.abs(
        ring
          .slice(0, -1)
          .reduce(
            (sum, p, i) =>
              sum +
              (p[0] - 120.99) * (ring[i + 1][1] - 24.79) -
              (ring[i + 1][0] - 120.99) * (p[1] - 24.79),
            0,
          ) / 2,
      );
    expect(
      parts.reduce((sum, part) => sum + area(part.footprint), 0),
    ).toBeCloseTo(area(mxic.geometry.footprint), 12);
  });
  test("falls back safely if MXIC's source outline changes", () => {
    const changed = {
      ...mxic,
      geometry: { ...mxic.geometry, footprint: building.geometry.footprint },
    };
    expect(
      getBuildingModelParts(changed, getBuildingHeight(changed)),
    ).toHaveLength(1);
  });
  test("uses verified levels only when OSM metadata is absent", () => {
    const engineering = campus.buildings.find(
      (b) => b.identityId === "engineering-i",
    )!;
    expect(getBuildingHeight(engineering)).toBeCloseTo(9 * 3.4);
    expect(
      getBuildingHeight({
        ...engineering,
        geometry: { ...engineering.geometry, height: 32 },
      }),
    ).toBe(32);
    expect(
      getBuildingHeight({
        ...engineering,
        geometry: { ...engineering.geometry, levels: 10 },
      }),
    ).toBe(34);
  });
});
