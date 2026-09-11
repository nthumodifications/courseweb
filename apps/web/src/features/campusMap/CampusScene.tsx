import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  AlwaysStencilFunc,
  EqualStencilFunc,
  KeepStencilOp,
  MeshStandardMaterial,
  ReplaceStencilOp,
} from "three";
import {
  clipGeoPolylineToBounds,
  geoToWorld,
  type CampusAreaFeature,
  type CampusBuilding,
  type CampusLinearFeature,
  type CampusMapFeature,
  type CampusMapData,
  type LatLon,
} from "@courseweb/shared";
import BuildingMesh from "./BuildingMesh";
import CampusCamera from "./CampusCamera";
import CampusTrees from "./CampusTrees";
import { createAreaGeometry, createRibbonGeometry } from "./sceneGeometry";
import {
  CAMPUS_BUILDING_COLORS,
  CAMPUS_ROAD_COLOR,
  createCampusFeatureLabelNumbers,
  getBuildingHeight,
  getCampusFeatureLabelKey,
  getCampusFeatureNames,
  isCampusBuilding,
} from "./sceneLogic";

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
  widthOffset?: number;
  clipToCampus?: boolean;
};

function LinearFeatures({
  features,
  origin,
  color,
  y,
  widthOffset = 0,
  clipToCampus = false,
}: LinearFeaturesProps) {
  const geometry = useMemo(
    () => createRibbonGeometry(features, origin, widthOffset),
    [features, origin, widthOffset],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (features.length === 0) return null;
  return (
    <mesh geometry={geometry} position-y={y} renderOrder={clipToCampus ? 1 : 0}>
      <meshBasicMaterial
        color={color}
        stencilWrite={clipToCampus}
        stencilRef={1}
        stencilFunc={EqualStencilFunc}
        stencilFail={KeepStencilOp}
        stencilZFail={KeepStencilOp}
        stencilZPass={KeepStencilOp}
      />
    </mesh>
  );
}

function CampusClipMask({
  boundary,
  origin,
}: {
  boundary?: CampusAreaFeature;
  origin: LatLon;
}) {
  const areas = useMemo(() => (boundary ? [boundary] : []), [boundary]);
  const geometry = useMemo(
    () => createAreaGeometry(areas, origin),
    [areas, origin],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!boundary) return null;
  return (
    <mesh geometry={geometry} renderOrder={-1}>
      <meshBasicMaterial
        colorWrite={false}
        depthTest={false}
        depthWrite={false}
        stencilWrite
        stencilRef={1}
        stencilFunc={AlwaysStencilFunc}
        stencilFail={KeepStencilOp}
        stencilZFail={KeepStencilOp}
        stencilZPass={ReplaceStencilOp}
      />
    </mesh>
  );
}

type CampusWorldProps = {
  data: CampusMapData;
  selectedFeature?: CampusMapFeature;
  resetNonce: number;
  language: "en" | "zh";
  onSelectFeature: (feature: CampusMapFeature) => void;
};

function CampusWorld({
  data,
  selectedFeature,
  resetNonce,
  language,
  onSelectFeature,
}: CampusWorldProps) {
  const materials = useMemo(
    () => ({
      standard: new MeshStandardMaterial({
        color: CAMPUS_BUILDING_COLORS.standard,
        roughness: 0.9,
      }),
      course: new MeshStandardMaterial({
        color: CAMPUS_BUILDING_COLORS.course,
        roughness: 0.82,
      }),
      food: new MeshStandardMaterial({
        color: CAMPUS_BUILDING_COLORS.food,
        roughness: 0.86,
      }),
      dormitory: new MeshStandardMaterial({
        color: CAMPUS_BUILDING_COLORS.dormitory,
        roughness: 0.86,
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
    const firstByBuilding = new Map<string, CampusBuilding>();
    data.buildings.forEach((building) => {
      const key = getCampusFeatureLabelKey(building);
      if (!firstByBuilding.has(key)) {
        firstByBuilding.set(key, building);
      }
    });
    return Array.from(firstByBuilding.values());
  }, [data.buildings]);
  const labelNumbers = useMemo(
    () => createCampusFeatureLabelNumbers(data),
    [data],
  );
  const labelAreas = useMemo(
    () => [...data.water, ...data.areas.filter((area) => Boolean(area.names))],
    [data.areas, data.water],
  );

  const selectedBuilding =
    selectedFeature && isCampusBuilding(selectedFeature)
      ? selectedFeature
      : undefined;

  const environment = useMemo(
    () => ({
      grass: data.areas.filter((area) => area.kind === "grass"),
      park: data.areas.filter((area) => area.kind === "park"),
      wood: data.areas.filter((area) => area.kind === "wood"),
      sports: data.areas.filter(
        (area) =>
          area.kind === "sports-pitch" &&
          !area.sport?.match(/baseball|softball/),
      ),
      baseball: data.areas.filter(
        (area) =>
          area.kind === "sports-pitch" &&
          Boolean(area.sport?.match(/baseball|softball/)),
      ),
      track: data.areas.filter((area) => area.kind === "athletics-track"),
      parking: data.areas.filter((area) => area.kind === "parking"),
    }),
    [data.areas],
  );
  const ground = useMemo(() => {
    const southwest = geoToWorld(
      { lat: data.bounds.south, lon: data.bounds.west },
      data.origin,
    );
    const northeast = geoToWorld(
      { lat: data.bounds.north, lon: data.bounds.east },
      data.origin,
    );
    return {
      x: (southwest.x + northeast.x) / 2,
      z: (southwest.z + northeast.z) / 2,
      width: Math.abs(northeast.x - southwest.x) + 100,
      depth: Math.abs(northeast.z - southwest.z) + 100,
    };
  }, [data.bounds, data.origin]);

  const boundaryLines = useMemo<CampusLinearFeature[]>(
    () =>
      data.boundary
        ? clipGeoPolylineToBounds(data.boundary.polygon, data.bounds).map(
            (points, index) => ({
              id: `${data.boundary!.id}-line-${index}`,
              kind: "path",
              points,
              width: 0.9,
            }),
          )
        : [],
    [data.boundary, data.bounds],
  );

  return (
    <>
      <color attach="background" args={["#e9efe6"]} />
      <fog attach="fog" args={["#e9efe6", 700, 1_650]} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[280, 520, 240]} intensity={2.1} />

      <mesh rotation-x={-Math.PI / 2} position={[ground.x, -0.08, ground.z]}>
        <planeGeometry args={[ground.width, ground.depth]} />
        <meshStandardMaterial color="#dce6d4" roughness={1} />
      </mesh>

      <Surface
        areas={environment.grass}
        origin={data.origin}
        color="#b8cdaa"
        y={0}
      />
      <Surface
        areas={environment.park}
        origin={data.origin}
        color="#aac5a3"
        y={0.005}
      />
      <Surface
        areas={environment.wood}
        origin={data.origin}
        color="#91ab8c"
        y={0.01}
      />
      <Surface
        areas={environment.sports}
        origin={data.origin}
        color="#a7bf96"
        y={0.02}
      />
      <Surface
        areas={environment.baseball}
        origin={data.origin}
        color="#c5aa80"
        y={0.021}
      />
      <Surface
        areas={environment.track}
        origin={data.origin}
        color="#b97d6c"
        y={0.025}
      />
      <Surface
        areas={environment.parking}
        origin={data.origin}
        color="#c7c1b5"
        y={0.03}
      />
      <Surface
        areas={data.water}
        origin={data.origin}
        color="#88bfd1"
        y={0.04}
      />
      <CampusClipMask boundary={data.boundary} origin={data.origin} />
      <LinearFeatures
        features={data.roads}
        origin={data.origin}
        color={CAMPUS_ROAD_COLOR}
        y={0.055}
        widthOffset={0.8}
        clipToCampus={Boolean(data.boundary)}
      />
      <LinearFeatures
        features={data.paths}
        origin={data.origin}
        color="#aa9e88"
        y={0.065}
        clipToCampus={Boolean(data.boundary)}
      />
      <LinearFeatures
        features={boundaryLines}
        origin={data.origin}
        color="#7e1083"
        y={0.075}
      />
      <CampusTrees trees={data.trees} origin={data.origin} y={0.04} />

      {labelAreas.map((area) => {
        const world = geoToWorld(area.location, data.origin);
        const names = getCampusFeatureNames(area);
        const label = language === "en" ? (names.en ?? names.zh) : names.zh;
        const labelNumber = labelNumbers.get(getCampusFeatureLabelKey(area));
        const numberedLabel = `#${labelNumber} ${label}`;
        const selected = area.id === selectedFeature?.id;
        return (
          <Html
            key={`${area.id}-label`}
            position={[world.x, 1, world.z]}
            center
            distanceFactor={area.kind === "water" ? 220 : 260}
            zIndexRange={[5, 0]}
            style={{ pointerEvents: "none" }}
          >
            <button
              type="button"
              data-campus-feature-id={area.id}
              data-campus-label-number={labelNumber}
              aria-label={numberedLabel}
              className={`pointer-events-auto block whitespace-nowrap rounded-full border px-2 py-1 text-center text-[10px] font-semibold leading-tight shadow-sm backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : area.kind === "water"
                    ? "border-sky-700/20 bg-background/90 text-sky-900 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-950"
                    : "border-primary/20 bg-background/90 text-foreground hover:bg-primary/10"
              }`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelectFeature(area);
              }}
            >
              {numberedLabel}
            </button>
          </Html>
        );
      })}

      {data.buildings.map((building) => {
        const selected = selectedBuilding
          ? getCampusFeatureLabelKey(building) ===
            getCampusFeatureLabelKey(selectedBuilding)
          : false;
        return (
          <BuildingMesh
            key={building.id}
            building={building}
            origin={data.origin}
            materials={materials}
            selected={selected}
            onSelect={onSelectFeature}
          />
        );
      })}

      {labelBuildings.map((building) => {
        const world = geoToWorld(building.location, data.origin);
        const label =
          language === "en"
            ? (building.names.en ?? building.names.zh)
            : building.names.zh;
        const labelNumber = labelNumbers.get(
          getCampusFeatureLabelKey(building),
        );
        const numberedLabel = `#${labelNumber} ${label}`;
        const selected = selectedBuilding
          ? getCampusFeatureLabelKey(building) ===
            getCampusFeatureLabelKey(selectedBuilding)
          : false;
        return (
          <Html
            key={`${getCampusFeatureLabelKey(building)}-label`}
            position={[world.x, getBuildingHeight(building) + 7, world.z]}
            center
            distanceFactor={260}
            zIndexRange={[5, 0]}
            style={{ pointerEvents: "none" }}
          >
            <button
              type="button"
              data-campus-feature-id={building.id}
              data-campus-label-number={labelNumber}
              aria-label={numberedLabel}
              className={`pointer-events-auto block whitespace-nowrap rounded-full border px-2 py-1 text-center text-[10px] font-semibold leading-tight shadow-sm backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/20 bg-background/90 text-foreground hover:bg-primary/10"
              }`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelectFeature(building);
              }}
            >
              {numberedLabel}
            </button>
          </Html>
        );
      })}

      <CampusCamera
        focusFeature={selectedFeature}
        origin={data.origin}
        bounds={data.bounds}
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
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        stencil: true,
      }}
      fallback={webglFallback}
    >
      <CampusWorld {...props} />
    </Canvas>
  );
}
