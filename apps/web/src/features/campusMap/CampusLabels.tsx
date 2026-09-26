import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import {
  geoToWorld,
  type CampusMapData,
  type CampusMapFeature,
} from "@courseweb/shared";
import { getBuildingModelProfile } from "./buildingModels";
import { layoutCampusLabels } from "./labelLayout";
import {
  createCampusFeatureLabelNumbers,
  getBuildingHeight,
  getCampusFeatureLabelKey,
  getCampusFeatureNames,
  isCampusBuilding,
} from "./sceneLogic";

type CampusLabelsProps = {
  data: CampusMapData;
  selected?: CampusMapFeature;
  language: "en" | "zh";
  limit: number;
  onSelect: (feature: CampusMapFeature) => void;
};

const fixedOverlay = (
  _object: unknown,
  _camera: unknown,
  size: { width: number; height: number },
) => [size.width / 2, size.height / 2];

export default function CampusLabels({
  data,
  selected,
  language,
  limit,
  onSelect,
}: CampusLabelsProps) {
  const nodes = useRef(new Map<number, HTMLButtonElement>());
  const projected = useMemo(() => new Vector3(), []);
  const selectedKey = selected ? getCampusFeatureLabelKey(selected) : undefined;
  const labels = useMemo(() => {
    const numbers = createCampusFeatureLabelNumbers(data);
    const features = new Map<string, CampusMapFeature>();
    [
      ...data.buildings,
      ...data.water,
      ...data.areas.filter((area) => area.names),
    ].forEach((feature) => {
      const key = getCampusFeatureLabelKey(feature);
      if (!features.has(key)) features.set(key, feature);
    });
    return Array.from(features, ([key, feature]) => {
      const world = geoToWorld(feature.location, data.origin);
      const names = getCampusFeatureNames(feature);
      const name = language === "en" ? (names.en ?? names.zh) : names.zh;
      const number = numbers.get(key);
      const text = `#${number} ${name}`;
      const building = isCampusBuilding(feature);
      return {
        key,
        feature,
        number,
        text,
        position: new Vector3(
          world.x,
          building ? getBuildingHeight(feature) + 3 : 1,
          world.z,
        ),
        priority: building
          ? getBuildingModelProfile(feature)
            ? 3
            : feature.identityId
              ? 2
              : 0
          : 1,
        width: Math.min(
          160,
          22 +
            Array.from(text).reduce(
              (n, char) => n + (char.charCodeAt(0) > 255 ? 11 : 6),
              0,
            ),
        ),
      };
    });
  }, [data, language]);

  useFrame(({ camera, size }) => {
    const candidates = labels.flatMap((label, index) => {
      projected.copy(label.position).project(camera);
      if (projected.z < -1 || projected.z > 1) return [];
      return [
        {
          index,
          x: ((projected.x + 1) * size.width) / 2,
          y: ((1 - projected.y) * size.height) / 2,
          width: label.width,
          priority: label.key === selectedKey ? 10 : label.priority,
          distance: camera.position.distanceToSquared(label.position),
        },
      ];
    });
    const visible = new Map(
      layoutCampusLabels(candidates, size, limit).map((label) => [
        label.index,
        label,
      ]),
    );
    nodes.current.forEach((node, index) => {
      const label = visible.get(index);
      node.hidden = !label;
      if (label)
        node.style.transform = `translate3d(${Math.round(label.x)}px,${Math.round(label.y)}px,0) translate(-50%,-100%)`;
    });
  });

  return (
    <Html
      fullscreen
      calculatePosition={fixedOverlay}
      zIndexRange={[5, 0]}
      style={{ pointerEvents: "none" }}
    >
      {labels.map((label, index) => (
        <button
          key={label.key}
          ref={(node) => {
            if (node) nodes.current.set(index, node);
            else nodes.current.delete(index);
          }}
          type="button"
          data-campus-feature-id={label.feature.id}
          data-campus-label-number={label.number}
          aria-label={label.text}
          title={label.text}
          className={`pointer-events-auto absolute left-0 top-0 max-w-[10rem] truncate rounded-full border px-2 py-1 text-[11px] font-bold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            label.key === selectedKey
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/20 bg-background/90 text-foreground hover:bg-primary/10"
          }`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(label.feature);
          }}
        >
          {label.text}
        </button>
      ))}
    </Html>
  );
}
