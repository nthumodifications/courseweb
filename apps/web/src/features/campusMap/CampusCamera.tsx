import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { CampusBuilding, LatLon } from "@courseweb/shared";
import { geoToWorld } from "@courseweb/shared";
import { getBuildingHeight } from "./sceneLogic";

const INITIAL_POSITION = new Vector3(430, 430, 560);
const INITIAL_TARGET = new Vector3(0, 0, 0);
const ANIMATION_DURATION_MS = 750;

type Tween = {
  startedAt: number;
  fromPosition: Vector3;
  toPosition: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
};

type CampusCameraProps = {
  focusBuilding?: CampusBuilding;
  origin: LatLon;
  resetNonce: number;
};

export default function CampusCamera({
  focusBuilding,
  origin,
  resetNonce,
}: CampusCameraProps) {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const tweenRef = useRef<Tween>();
  const { camera, invalidate } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    let target = INITIAL_TARGET.clone();
    let position = INITIAL_POSITION.clone();
    if (focusBuilding) {
      const world = geoToWorld(focusBuilding.location, origin);
      const height = getBuildingHeight(focusBuilding);
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
  }, [camera, focusBuilding, invalidate, origin, resetNonce]);

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
      maxDistance={1_300}
      maxPolarAngle={Math.PI / 2.04}
      target={INITIAL_TARGET}
      onChange={() => invalidate()}
    />
  );
}
