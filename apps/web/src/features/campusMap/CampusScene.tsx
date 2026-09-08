import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { MeshStandardMaterial } from "three";
import {
  geoToWorld,
  type CampusAreaFeature,
  type CampusBuilding,
  type CampusLinearFeature,
  type CampusMapData,
  type LatLon,
} from "@courseweb/shared";
import BuildingMesh from "./BuildingMesh";
import CampusCamera from "./CampusCamera";
import { createAreaGeometry, createRibbonGeometry } from "./sceneGeometry";
import { getBuildingHeight } from "./sceneLogic";

const LABEL_PRIORITY = new Set([
  "delta",
  "mxic",
  "tsmc",
  "general-ii",
  "physics",
  "hss",
  "student-union",
]);

type SurfaceProps = {
  areas: CampusAreaFeature[];
  origin: LatLon;
  color: string;
  y: number;
};

function Surface({ areas, origin, color, y }: SurfaceProps) {
  const geometry = useMemo(
    () => createAreaGeometry(areas, origin),
    [areas, origin],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (areas.length === 0) return null;
  return (
    <mesh geometry={geometry} position-y={y}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

type LinearFeaturesProps = {
  features: CampusLinearFeature[];
  origin: LatLon;
  color: string;
  y: number;
};

function LinearFeatures({ features, origin, color, y }: LinearFeaturesProps) {
  const geometry = useMemo(
    () => createRibbonGeometry(features, origin),
    [features, origin],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (features.length === 0) return null;
  return (
    <mesh geometry={geometry} position-y={y}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

type CampusWorldProps = {
  data: CampusMapData;
  selectedBuilding?: CampusBuilding;
  resetNonce: number;
  language: "en" | "zh";
  onSelectBuilding: (building: CampusBuilding) => void;
};

function CampusWorld({
  data,
  selectedBuilding,
  resetNonce,
  language,
  onSelectBuilding,
}: CampusWorldProps) {
  const materials = useMemo(
    () => ({
      standard: new MeshStandardMaterial({ color: "#d9d3c7", roughness: 0.9 }),
      recognized: new MeshStandardMaterial({
        color: "#cdb9d1",
        roughness: 0.82,
      }),
      hovered: new MeshStandardMaterial({ color: "#a56caf", roughness: 0.75 }),
      selected: new MeshStandardMaterial({ color: "#7e1083", roughness: 0.68 }),
    }),
    [],
  );
  useEffect(
    () => () =>
      Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  );

  const labelBuildings = useMemo(() => {
    const firstByIdentity = new Map<string, CampusBuilding>();
    data.buildings.forEach((building) => {
      if (
        building.identityId &&
        (LABEL_PRIORITY.has(building.identityId) ||
          building.identityId === selectedBuilding?.identityId) &&
        !firstByIdentity.has(building.identityId)
      ) {
        firstByIdentity.set(building.identityId, building);
      }
    });
    return Array.from(firstByIdentity.values());
  }, [data.buildings, selectedBuilding?.identityId]);

  const boundaryLines = useMemo<CampusLinearFeature[]>(
    () =>
      data.boundary
        ? [
            {
              id: `${data.boundary.id}-line`,
              kind: "path",
              points: data.boundary.polygon,
              width: 0.9,
            },
          ]
        : [],
    [data.boundary],
  );

  const waterLabels = useMemo(
    () => data.water.filter((area) => area.names),
    [data.water],
  );

  return (
    <>
      <color attach="background" args={["#e9efe6"]} />
      <fog attach="fog" args={["#e9efe6", 700, 1_650]} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[280, 520, 240]} intensity={2.1} />

      <mesh rotation-x={-Math.PI / 2} position-y={-0.08}>
        <planeGeometry args={[1_800, 1_800]} />
        <meshStandardMaterial color="#dce6d4" roughness={1} />
      </mesh>

      <Surface
        areas={data.water}
        origin={data.origin}
        color="#88bfd1"
        y={0.02}
      />
      <LinearFeatures
        features={data.roads}
        origin={data.origin}
        color="#f8f4ea"
        y={0.05}
      />
      <LinearFeatures
        features={data.paths}
        origin={data.origin}
        color="#c7bfae"
        y={0.07}
      />
      <LinearFeatures
        features={boundaryLines}
        origin={data.origin}
        color="#7e1083"
        y={0.09}
      />

      {waterLabels.map((area) => {
        const world = geoToWorld(area.location, data.origin);
        const label =
          language === "en"
            ? (area.names?.en ?? area.names?.zh)
            : area.names?.zh;
        return (
          <Html
            key={`${area.id}-label`}
            position={[world.x, 1, world.z]}
            center
            distanceFactor={220}
            style={{ pointerEvents: "none" }}
          >
            <span className="block whitespace-nowrap rounded-full border border-sky-700/20 bg-background/90 px-2 py-1 text-center text-[10px] font-semibold text-sky-900 shadow-sm backdrop-blur-sm dark:text-sky-200">
              {label}
            </span>
          </Html>
        );
      })}

      {data.buildings.map((building) => {
        const selected = selectedBuilding?.identityId
          ? building.identityId === selectedBuilding.identityId
          : building.id === selectedBuilding?.id;
        return (
          <BuildingMesh
            key={building.id}
            building={building}
            origin={data.origin}
            materials={materials}
            selected={selected}
            onSelect={onSelectBuilding}
          />
        );
      })}

      {labelBuildings.map((building) => {
        const world = geoToWorld(building.location, data.origin);
        const label =
          language === "en"
            ? (building.names.en ?? building.names.zh)
            : building.names.zh;
        return (
          <Html
            key={building.identityId}
            position={[world.x, getBuildingHeight(building) + 7, world.z]}
            center
            distanceFactor={260}
            style={{ pointerEvents: "none" }}
          >
            <span className="block max-w-32 rounded-full border border-primary/20 bg-background/90 px-2 py-1 text-center text-[10px] font-semibold leading-tight text-foreground shadow-sm backdrop-blur-sm">
              {label}
            </span>
          </Html>
        );
      })}

      <CampusCamera
        focusBuilding={selectedBuilding}
        origin={data.origin}
        resetNonce={resetNonce}
      />
    </>
  );
}

type CampusSceneProps = CampusWorldProps & {
  webglFallback: React.ReactNode;
};

export default function CampusScene({
  webglFallback,
  ...props
}: CampusSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [430, 430, 560], fov: 46, near: 1, far: 2_500 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      fallback={webglFallback}
    >
      <CampusWorld {...props} />
    </Canvas>
  );
}
