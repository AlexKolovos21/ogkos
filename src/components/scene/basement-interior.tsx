import { Suv } from "@/components/scene/suv";
import { garageRamps, packParking, packStorage, RAMP_W, STALL_D, STALL_W, takeStalls } from "@/lib/building/parking";
import type { Mass, ProjectInputs } from "@/lib/building/types";
import { memo, useMemo } from "react";
import * as THREE from "three";

const slab = new THREE.MeshLambertMaterial({ color: "#8a8478" });
const stripe = new THREE.MeshLambertMaterial({ color: "#e6c84a" });
const stop = new THREE.MeshLambertMaterial({ color: "#c45c3a" });
const doorMat = new THREE.MeshLambertMaterial({ color: "#3d4248" });
const rampMat = new THREE.MeshLambertMaterial({ color: "#6a6560" });
const rail = new THREE.MeshLambertMaterial({ color: "#9aa0a6" });
const lamp = new THREE.MeshLambertMaterial({ color: "#f0e6c8" });
const storeFill = new THREE.MeshLambertMaterial({ color: "#c4a574" });
const zAxis = new THREE.Vector3(0, 0, 1);

export const BasementInterior = memo(function BasementInterior({
  mass, inputs, inspect, count,
}: { mass: Mass; inputs: ProjectInputs; inspect: boolean; count: number }) {
  const w = mass.width;
  const d = mass.depth;
  const side = inputs.rampSide ?? "left";
  const packed = packParking(w, d, inputs.garageDoor, side);
  const stalls = inspect ? packed.stalls : takeStalls(packed.stalls, count);
  const stores = inspect && inputs.basementStorage ? packStorage(w, d, inputs.garageDoor, side) : [];
  const rampBay = inspect && inputs.garageDoor;
  const slabW = rampBay ? w - RAMP_W - 0.3 : w;
  const slabX = rampBay ? (side === "right" ? -(RAMP_W + 0.3) / 2 : (RAMP_W + 0.3) / 2) : 0;
  return (
    <group position={[mass.x, mass.y, mass.z]}>
      <mesh position={[slabX, 0.05, 0]} material={slab}><boxGeometry args={[slabW, 0.12, d]} /></mesh>
      {inspect ? stores.map((r, i) => (
        <mesh key={`st-${i}`} position={[r.x, 0.12, r.z]} material={storeFill}>
          <boxGeometry args={[r.width - 0.1, 0.1, r.depth - 0.1]} />
        </mesh>
      )) : null}
      {inspect ? [-d / 5, d / 6].map((z) => (
        <mesh key={z} position={[slabX, 0.22, z]} material={lamp}><boxGeometry args={[0.9, 0.06, 0.22]} /></mesh>
      )) : null}
      {stalls.map((s, i) => (
        <group key={i}>
          <mesh position={[s.x, 0.08, s.z]} rotation={[0, s.rot, 0]} material={stripe}>
            <boxGeometry args={[STALL_D - 0.2, 0.02, STALL_W - 0.22]} />
          </mesh>
          <mesh position={[s.x, 0.11, s.z]} rotation={[0, s.rot, 0]} material={stop}>
            <boxGeometry args={[0.14, 0.1, STALL_W - 0.5]} />
          </mesh>
          {inspect ? <Suv position={[s.x, 0.02, s.z]} rotationY={s.rot} tone={i} scale={0.92} /> : null}
        </group>
      ))}
    </group>
  );
});

function RampRun({ x, y0, z0, y1, z1, width }: { x: number; y0: number; z0: number; y1: number; z1: number; width: number }) {
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.hypot(dy, dz);
  const quat = useMemo(() => {
    const dir = new THREE.Vector3(0, dy, dz);
    if (dir.lengthSq() < 1e-6) return new THREE.Quaternion();
    return new THREE.Quaternion().setFromUnitVectors(zAxis, dir.normalize());
  }, [dy, dz]);
  return (
    <group position={[x, (y0 + y1) / 2 + 0.05, (z0 + z1) / 2]} quaternion={quat}>
      <mesh material={rampMat}><boxGeometry args={[width, 0.18, len]} /></mesh>
      <mesh position={[-width / 2 + 0.05, 0.38, 0]} material={rail}><boxGeometry args={[0.07, 0.55, len]} /></mesh>
      <mesh position={[width / 2 - 0.05, 0.38, 0]} material={rail}><boxGeometry args={[0.07, 0.55, len]} /></mesh>
    </group>
  );
}

export const GarageRamps = memo(function GarageRamps({
  upper, lower, inputs, open,
}: { upper: Mass; lower?: Mass; inputs: ProjectInputs; open: boolean }) {
  if (!inputs.garageDoor) return null;
  const segs = garageRamps({
    cx: upper.x, cz: upper.z, width: upper.width, depth: upper.depth,
    yStreet: 0.04, yUpper: upper.y + 0.08, yLower: lower ? lower.y + 0.08 : undefined, side: inputs.rampSide,
  });
  const start = segs[0];
  return (
    <group>
      {segs.map((s, i) => (
        <RampRun key={i} x={s.x} y0={s.y0} z0={s.z0} y1={s.y1} z1={s.z1} width={RAMP_W} />
      ))}
      {start ? (
        <mesh position={[start.x, open ? 1.7 : 1.1, start.z0 - 0.15]} rotation={[open ? -1.05 : 0, 0, 0]} material={doorMat}>
          <boxGeometry args={[RAMP_W + 0.2, 2.1, 0.1]} />
        </mesh>
      ) : null}
    </group>
  );
});
