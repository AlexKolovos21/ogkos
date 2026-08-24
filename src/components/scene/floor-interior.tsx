import type { Apartment, FloorInfo } from "@/lib/building/types";
import { memo } from "react";
import * as THREE from "three";

const slab = new THREE.MeshLambertMaterial({ color: "#d8d2c6" });
const wallMat = new THREE.MeshLambertMaterial({
  color: "#efe8dc",
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const innerWall = new THREE.MeshLambertMaterial({
  color: "#e7dfd2",
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const coreMat = new THREE.MeshLambertMaterial({ color: "#c8bfb0" });
const livingMat = new THREE.MeshLambertMaterial({ color: "#e2d2b4" });
const kitchenMat = new THREE.MeshLambertMaterial({ color: "#d3c09a" });
const bedMat = new THREE.MeshLambertMaterial({ color: "#c5d0c0" });
const bathMat = new THREE.MeshLambertMaterial({ color: "#c5ccd4" });
const shopMat = new THREE.MeshLambertMaterial({ color: "#8d8678" });

const ROOM_MAT: Record<string, THREE.MeshLambertMaterial> = {
  living: livingMat,
  kitchen: kitchenMat,
  bed: bedMat,
  bath: bathMat,
  shop: shopMat,
};

const unitMats = new Map<string, THREE.MeshLambertMaterial>();
function unitMat(color: string) {
  let m = unitMats.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    unitMats.set(color, m);
  }
  return m;
}

function UnitPlate({
  unit,
  floor,
  selected,
  inspect,
}: {
  unit: Apartment;
  floor: FloorInfo;
  selected: boolean;
  inspect: boolean;
}) {
  const lx = unit.x - floor.x;
  const lz = unit.z - floor.z;
  const roomH = inspect ? 0.22 : 0.08;
  const innerH = inspect ? 1.05 : 0.55;
  return (
    <group position={[lx, 0, lz]}>
      <mesh position={[0, selected ? 0.06 : 0.04, 0]} material={unitMat(unit.color)}>
        <boxGeometry
          args={[Math.max(0.4, unit.width - 0.16), selected ? 0.08 : 0.05, Math.max(0.4, unit.depth - 0.16)]}
        />
      </mesh>
      {unit.rooms.map((r, i) => (
        <mesh
          key={i}
          position={[r.x, roomH / 2 + 0.06, r.z]}
          material={ROOM_MAT[r.kind] ?? livingMat}
        >
          <boxGeometry args={[Math.max(0.3, r.width), roomH, Math.max(0.3, r.depth)]} />
        </mesh>
      ))}
      {inspect ? null : unit.walls.map((w, i) => (
        <mesh key={`iw-${i}`} position={[w.x, innerH / 2 + 0.04, w.z]} material={innerWall}>
          <boxGeometry args={[Math.max(0.08, w.width), innerH, Math.max(0.08, w.depth)]} />
        </mesh>
      ))}
    </group>
  );
}

export const FloorInterior = memo(function FloorInterior({
  floor,
  explodeY,
  selected,
  selectedUnitId,
}: {
  floor: FloorInfo;
  explodeY: number;
  selected: boolean;
  selectedUnitId: string | null;
}) {
  const wallH = selected ? 1.35 : 0.7;
  const cw = Math.min(2.5, floor.width * 0.3);
  const cd = Math.min(4, floor.depth * 0.36);

  return (
    <group position={[floor.x, floor.y + explodeY, floor.z]}>
      <mesh position={[0, 0.03, 0]} material={slab}>
        <boxGeometry args={[floor.width + 0.1, 0.08, floor.depth + 0.1]} />
      </mesh>
      {floor.units.map((u) => (
        <UnitPlate
          key={u.id}
          unit={u}
          floor={floor}
          selected={selectedUnitId === u.id}
          inspect={selected}
        />
      ))}
      {selected
        ? null
        : floor.walls.map((w, i) => (
            <mesh key={i} position={[w.x, wallH / 2 + 0.04, w.z]} material={wallMat}>
              <boxGeometry args={[w.width, wallH, w.depth]} />
            </mesh>
          ))}
      {floor.kind !== "pilotis" && floor.kind !== "basement" ? (
        <mesh
          position={[0, wallH / 2 + 0.04, floor.depth / 2 - cd / 2 - 0.15]}
          material={coreMat}
        >
          <boxGeometry args={[cw, wallH, cd]} />
        </mesh>
      ) : null}
    </group>
  );
});
