import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { CampusBounds, CampusMapFeature, LatLon } from "@courseweb/shared";
import { geoToWorld } from "@courseweb/shared";
import { getBuildingHeight, isCampusBuilding } from "./sceneLogic";

const INITIAL_OFFSET = new Vector3(430, 430, 560);
const ANIMATION_DURATION_MS = 750;

type Tween = {
  startedAt: number;
  fromPosition: Vector3;
  toPosition: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
};

type CampusCameraProps = {
  focusFeature?: CampusMapFeature;
  origin: LatLon;
  bounds: CampusBounds;
  resetNonce: number;
};

export default function CampusCamera({
  focusFeature,
  origin,
  bounds,
  resetNonce,
}: CampusCameraProps) {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const tweenRef = useRef<Tween>();
  const { camera, invalidate } = useThree();
  const initialTarget = useMemo(() => {
    const boundsCenter = geoToWorld(
      {
        lat: (bounds.south + bounds.north) / 2,
        lon: (bounds.west + bounds.east) / 2,
      },
      origin,
    );
    return new Vector3(boundsCenter.x, 0, boundsCenter.z);
  }, [bounds.east, bounds.north, bounds.south, bounds.west, origin]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    let target = initialTarget.clone();
    let position = initialTarget.clone().add(INITIAL_OFFSET);
    if (focusFeature) {
      const world = geoToWorld(focusFeature.location, origin);
      const height = isCampusBuilding(focusFeature)
        ? getBuildingHeight(focusFeature)
        : 0;
      target = new Vector3(world.x, Math.min(height * 0.35, 14), world.z);
      position = new Vector3(world.x + 105, 105, world.z + 135);
    }

    tweenRef.current = {
      startedAt: performance.now(),
      fromPosition: camera.position.clone(),
      toPosition: position,
      fromTarget: controls.target.clone(),
      toTarget: target,
    };
    invalidate();
  }, [camera, focusFeature, initialTarget, invalidate, origin, resetNonce]);

  useFrame(() => {
    const tween = tweenRef.current;
    const controls = controlsRef.current;
    if (!tween || !controls) return;

    const progress = Math.min(
      (performance.now() - tween.startedAt) / ANIMATION_DURATION_MS,
      1,
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(tween.fromPosition, tween.toPosition, eased);
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
    controls.update();

    if (progress < 1) invalidate();
    else tweenRef.current = undefined;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan
      enableRotate
      enableZoom
      minDistance={45}
      maxDistance={1_000}
      maxPolarAngle={Math.PI / 2.04}
      target={initialTarget}
      onChange={() => invalidate()}
    />
  );
}
