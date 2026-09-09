import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  ConeGeometry,
  CylinderGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { geoToWorld, type CampusTree, type LatLon } from "@courseweb/shared";

type CampusTreesProps = {
  trees: CampusTree[];
  origin: LatLon;
  y: number;
};

function stableTreeVariant(id: string): { rotation: number; scale: number } {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  const normalized = Math.abs(hash % 1_000) / 1_000;
  return {
    rotation: normalized * Math.PI * 2,
    scale: 0.82 + normalized * 0.3,
  };
}

export default function CampusTrees({ trees, origin, y }: CampusTreesProps) {
  const trunkRef = useRef<InstancedMesh>(null);
  const crownRef = useRef<InstancedMesh>(null);
  const resources = useMemo(
    () => ({
      trunkGeometry: new CylinderGeometry(0.65, 0.8, 4.8, 5),
      crownGeometry: new ConeGeometry(3.5, 7.2, 7),
      trunkMaterial: new MeshStandardMaterial({
        color: "#766451",
        roughness: 1,
      }),
      crownMaterial: new MeshStandardMaterial({
        color: "#5f7f62",
        roughness: 1,
      }),
    }),
    [],
  );

  useLayoutEffect(() => {
    const trunk = trunkRef.current;
    const crown = crownRef.current;
    if (!trunk || !crown) return;

    const transform = new Object3D();
    trees.forEach((tree, index) => {
      const world = geoToWorld(tree.location, origin);
      const variant = stableTreeVariant(tree.id);

      transform.position.set(world.x, y + 2.4 * variant.scale, world.z);
      transform.rotation.set(0, variant.rotation, 0);
      transform.scale.setScalar(variant.scale);
      transform.updateMatrix();
      trunk.setMatrixAt(index, transform.matrix);

      transform.position.set(world.x, y + 7.1 * variant.scale, world.z);
      transform.rotation.set(0, variant.rotation, 0);
      transform.scale.setScalar(variant.scale);
      transform.updateMatrix();
      crown.setMatrixAt(index, transform.matrix);
    });
    trunk.instanceMatrix.needsUpdate = true;
    crown.instanceMatrix.needsUpdate = true;
    trunk.computeBoundingSphere();
    crown.computeBoundingSphere();
  }, [origin, trees, y]);

  useEffect(
    () => () =>
      Object.values(resources).forEach((resource) => resource.dispose()),
    [resources],
  );

  if (trees.length === 0) return null;
  return (
    <>
      <instancedMesh
        ref={trunkRef}
        args={[resources.trunkGeometry, resources.trunkMaterial, trees.length]}
        castShadow={false}
        receiveShadow={false}
      />
      <instancedMesh
        ref={crownRef}
        args={[resources.crownGeometry, resources.crownMaterial, trees.length]}
        castShadow={false}
        receiveShadow={false}
      />
    </>
  );
}
