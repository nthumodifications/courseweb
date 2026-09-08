import { useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import type { CampusBuilding, LatLon } from "@courseweb/shared";
import { createBuildingGeometry } from "./sceneGeometry";

type BuildingMaterials = {
  standard: MeshStandardMaterial;
  recognized: MeshStandardMaterial;
  hovered: MeshStandardMaterial;
  selected: MeshStandardMaterial;
};

type BuildingMeshProps = {
  building: CampusBuilding;
  origin: LatLon;
  materials: BuildingMaterials;
  selected: boolean;
  onSelect: (building: CampusBuilding) => void;
};

export default function BuildingMesh({
  building,
  origin,
  materials,
  selected,
  onSelect,
}: BuildingMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(
    () => createBuildingGeometry(building, origin),
    [building, origin],
  );
  const restingMaterial = building.identityId
    ? materials.recognized
    : materials.standard;

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material = selected
        ? materials.selected
        : restingMaterial;
    }
  }, [materials.selected, restingMaterial, selected]);

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!selected && meshRef.current) {
      meshRef.current.material = materials.hovered;
    }
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (meshRef.current) {
      meshRef.current.material = selected
        ? materials.selected
        : restingMaterial;
    }
    document.body.style.cursor = "default";
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={selected ? materials.selected : restingMaterial}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(building);
      }}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}
