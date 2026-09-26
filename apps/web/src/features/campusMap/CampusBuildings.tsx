import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { CampusBuilding, LatLon } from "@courseweb/shared";
import {
  createCampusBuildingModel,
  findBuildingAtFace,
  type BuildingTile,
} from "./buildingGeometry";
import { createBuildingMaterial } from "./buildingMaterial";
import { getCampusFeatureLabelKey } from "./sceneLogic";

type CampusBuildingsProps = {
  buildings: CampusBuilding[];
  origin: LatLon;
  selected?: CampusBuilding;
  onSelect: (building: CampusBuilding) => void;
};

export default function CampusBuildings({
  buildings,
  origin,
  selected,
  onSelect,
}: CampusBuildingsProps) {
  const { invalidate, gl } = useThree();
  const model = useMemo(
    () => createCampusBuildingModel(buildings, origin),
    [buildings, origin],
  );
  const surface = useMemo(createBuildingMaterial, []);

  useLayoutEffect(() => {
    surface.selected.value = selected
      ? (model.selectionIds.get(getCampusFeatureLabelKey(selected)) ?? -1)
      : -1;
    invalidate();
  }, [selected, model, surface, invalidate]);

  useEffect(
    () => () => {
      model.tiles.forEach((tile) => tile.geometry.dispose());
    },
    [model],
  );
  useEffect(
    () => () => {
      surface.material.dispose();
      gl.domElement.style.cursor = "";
    },
    [surface, gl],
  );

  const hover = (tile: BuildingTile, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.pointerType === "touch" || event.buttons !== 0) return;
    const building = findBuildingAtFace(tile, event.faceIndex);
    const id = building
      ? model.selectionIds.get(getCampusFeatureLabelKey(building))!
      : -1;
    if (surface.hovered.value === id) return;
    surface.hovered.value = id;
    gl.domElement.style.cursor = id > 0 ? "pointer" : "";
    invalidate();
  };

  return (
    <group>
      {model.tiles.map((tile) => (
        <mesh
          key={tile.key}
          geometry={tile.geometry}
          material={surface.material}
          dispose={null}
          onClick={(event) => {
            event.stopPropagation();
            // A pan/rotate release must not select a building underneath the finger.
            if (event.delta > 5) return;
            const building = findBuildingAtFace(tile, event.faceIndex);
            if (building) onSelect(building);
          }}
          onPointerMove={(event) => hover(tile, event)}
          onPointerOut={() => {
            surface.hovered.value = -1;
            gl.domElement.style.cursor = "";
            invalidate();
          }}
        />
      ))}
    </group>
  );
}
