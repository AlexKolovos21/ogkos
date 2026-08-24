import { BasementInterior, GarageRamps } from "@/components/scene/basement-interior";
import { FloorInterior } from "@/components/scene/floor-interior";
import { packParking, splitParking } from "@/lib/building/parking";
import type { FloorInfo, Mass, ProjectInputs } from "@/lib/building/types";
import { memo, useMemo } from "react";
import * as THREE from "three";

const lambert = (color: string) => new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: 1 });
const FACADES: Record<string, THREE.MeshLambertMaterial> = {
  cream: lambert("#eadfcb"), white: lambert("#f4f0e8"), ochre: lambert("#d9c29a"), sand: lambert("#cbb89a"), gray: lambert("#c9c5bd"),
};
const glass = new THREE.MeshLambertMaterial({ color: "#15222e" });
const glassLit = new THREE.MeshLambertMaterial({ color: "#cbb48a" });
const frame = lambert("#f3eee6");
const sill = lambert("#d8d0c4");
const concrete = lambert("#d6d0c4");
const marble = lambert("#cfc8bc");
const stone = lambert("#8a8376");
const coreMat = lambert("#d2c8b6");
const metal = lambert("#9aa0a6");
const rail = lambert("#b7b3ab");
const roofMat = lambert("#5a554e");
const tileMat = lambert("#8a5a42");
const doorMat = lambert("#3a332c");
const solar = lambert("#1c2830");
const tank = lambert("#c5c0b6");
const ac = lambert("#d0cdc6");

function WindowBay({ x, y, z, w, h, lit }: { x: number; y: number; z: number; w: number; h: number; lit?: boolean }) {
  return (
    <group>
      <mesh position={[x, y, z]} material={frame}><boxGeometry args={[w + 0.14, h + 0.14, 0.05]} /></mesh>
      <mesh position={[x, y, z - 0.03]} material={lit ? glassLit : glass}><boxGeometry args={[w, h, 0.05]} /></mesh>
      <mesh position={[x, y, z - 0.04]} material={frame}><boxGeometry args={[0.05, h, 0.04]} /></mesh>
      <mesh position={[x, y - h / 2 - 0.05, z - 0.02]} material={sill}><boxGeometry args={[w + 0.18, 0.06, 0.14]} /></mesh>
    </group>
  );
}

function FacadeWindows({ width, height, depth, y0, shop, door, sides }: { width: number; height: number; depth: number; y0: number; shop?: boolean; door?: boolean; sides?: boolean }) {
  const cols = Math.min(5, Math.max(2, Math.floor(width / 2.35)));
  const ww = shop ? Math.min(2.15, width / cols - 0.4) : 1.02;
  const wh = shop ? Math.min(2.05, height * 0.55) : 1.22;
  const z = -depth / 2 - 0.045;
  const y = y0 + height * 0.55;
  const gap = width / (cols + 1);
  const mid = Math.floor(cols / 2);
  const sideCols = Math.min(3, Math.max(1, Math.floor(depth / 4)));
  return (
    <group>
      {Array.from({ length: cols }, (_, c) => {
        const x = -width / 2 + gap * (c + 1);
        if (door && c === mid) {
          return (
            <group key={c}>
              <mesh position={[x, y0 + 1.08, z]} material={doorMat}><boxGeometry args={[1.05, 2.12, 0.08]} /></mesh>
              <mesh position={[x, y0 + 2.28, z - 0.35]} material={concrete}><boxGeometry args={[1.8, 0.08, 0.9]} /></mesh>
            </group>
          );
        }
        return <WindowBay key={c} x={x} y={y} z={z} w={ww} h={wh} lit={!shop && c % 3 === 1} />;
      })}
      {sides ? Array.from({ length: sideCols }, (_, c) => {
        const zSide = -depth / 2 + (depth / (sideCols + 1)) * (c + 1);
        return (
          <group key={`s-${c}`}>
            <mesh position={[width / 2 + 0.04, y, zSide]} material={glass}><boxGeometry args={[0.06, 1.1, 0.82]} /></mesh>
            <mesh position={[-width / 2 - 0.04, y, zSide]} material={glass}><boxGeometry args={[0.06, 1.1, 0.82]} /></mesh>
          </group>
        );
      }) : null}
    </group>
  );
}

function Balcony({
  width, y, depth, railDepth, partitions = [],
}: { width: number; y: number; depth: number; railDepth: number; partitions?: number[] }) {
  if (railDepth <= 0.15) return null;
  const zFace = -depth / 2;
  const z = zFace - railDepth / 2;
  const posts = Math.min(9, Math.max(4, Math.round(width / 1.6)));
  return (
    <group>
      <mesh position={[0, y, z]} material={concrete}><boxGeometry args={[width * 0.94, 0.11, railDepth]} /></mesh>
      <mesh position={[0, y + 0.52, zFace - railDepth + 0.03]} material={rail}><boxGeometry args={[width * 0.94, 0.05, 0.05]} /></mesh>
      <mesh position={[-width * 0.47, y + 0.28, zFace - railDepth + 0.03]} material={rail}><boxGeometry args={[0.05, 0.5, 0.05]} /></mesh>
      <mesh position={[width * 0.47, y + 0.28, zFace - railDepth + 0.03]} material={rail}><boxGeometry args={[0.05, 0.5, 0.05]} /></mesh>
      {Array.from({ length: posts }, (_, i) => {
        const x = -width * 0.44 + (i * (width * 0.88)) / Math.max(1, posts - 1);
        return <mesh key={i} position={[x, y + 0.28, zFace - railDepth + 0.03]} material={metal}><boxGeometry args={[0.03, 0.48, 0.03]} /></mesh>;
      })}
      {partitions.map((px, i) => (
        <mesh key={`p-${i}`} position={[px, y + 0.62, z]} material={concrete}>
          <boxGeometry args={[0.06, 1.35, railDepth - 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

function Cornice({ width, depth, y }: { width: number; depth: number; y: number }) {
  return <mesh position={[0, y, -depth / 2 - 0.04]} material={sill}><boxGeometry args={[width + 0.06, 0.07, 0.1]} /></mesh>;
}

function Columns({ width, depth, height }: { width: number; depth: number; height: number }) {
  const nx = Math.min(4, Math.max(2, Math.round(width / 5) + 1));
  const nz = Math.min(3, Math.max(2, Math.round(depth / 6) + 1));
  const items = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      out.push({ x: -width / 2 + 0.5 + (i * (width - 1)) / Math.max(1, nx - 1), z: -depth / 2 + 0.5 + (j * (depth - 1)) / Math.max(1, nz - 1) });
    }
    return out;
  }, [width, depth, nx, nz]);
  return <group>{items.map((p, i) => <mesh key={i} position={[p.x, height / 2, p.z]} material={marble}><cylinderGeometry args={[0.2, 0.22, height, 8]} /></mesh>)}</group>;
}

function HipRoof({ mass }: { mass: Mass }) {
  const r = Math.max(mass.width, mass.depth) * 0.52;
  return <mesh position={[mass.x, mass.y + mass.height + 0.85, mass.z]} rotation={[0, Math.PI / 4, 0]} material={tileMat}><coneGeometry args={[r, 1.7, 4]} /></mesh>;
}

function FlatRoof({ mass }: { mass: Mass }) {
  const y = mass.y + mass.height;
  return (
    <group>
      <mesh position={[mass.x, y + 0.08, mass.z]} material={roofMat}><boxGeometry args={[mass.width - 0.25, 0.12, mass.depth - 0.25]} /></mesh>
      <mesh position={[mass.x, y + 0.34, mass.z]} material={concrete}><boxGeometry args={[mass.width + 0.08, 0.14, mass.depth + 0.08]} /></mesh>
      <mesh position={[mass.x + mass.width * 0.18, y + 0.52, mass.z - mass.depth * 0.12]} rotation={[-0.55, 0.12, 0]} material={solar}><boxGeometry args={[2.4, 0.05, 1.35]} /></mesh>
      <mesh position={[mass.x - mass.width * 0.28, y + 0.85, mass.z + mass.depth * 0.12]} material={tank}><cylinderGeometry args={[0.42, 0.42, 0.9, 10]} /></mesh>
      <mesh position={[mass.x + mass.width * 0.32, y + 0.52, mass.z + mass.depth * 0.22]} material={ac}><boxGeometry args={[0.7, 0.35, 0.55]} /></mesh>
    </group>
  );
}

export const BuildingMesh = memo(function BuildingMesh({
  masses, floors, inputs, explode, selectedFloor, selectedUnitId, parkingSpaces,
}: { masses: Mass[]; floors: FloorInfo[]; inputs: ProjectInputs; explode: boolean; selectedFloor: number | null; selectedUnitId: string | null; parkingSpaces: number }) {
  const plasterM = FACADES[inputs.facade] ?? FACADES.cream;
  const typical = masses.filter((m) => m.kind === "typical" || m.kind === "recessed" || m.kind === "commercial");
  const top = typical[typical.length - 1];
  const core = masses.find((m) => m.kind === "core");
  const cutaway = selectedFloor !== null;
  const interiors = explode || cutaway;
  const parkingFor = useMemo(() => {
    const map = new Map<string, number>();
    const levels = masses.filter((m) => m.kind === "basement").sort((a, b) => b.floorIndex - a.floorIndex);
    const caps = levels.map((m) => packParking(m.width, m.depth, inputs.garageDoor, inputs.rampSide, inputs.basementStorage).capacity);
    const split = splitParking(caps, parkingSpaces);
    levels.forEach((m, i) => map.set(m.id, split[i] ?? 0));
    return map;
  }, [masses, parkingSpaces, inputs.garageDoor, inputs.rampSide, inputs.basementStorage]);
  const firstBasement = masses.find((m) => m.kind === "basement" && m.floorIndex === -1) ?? masses.find((m) => m.kind === "basement");
  const floorByIndex = useMemo(() => { const map = new Map<number, FloorInfo>(); for (const f of floors) map.set(f.index, f); return map; }, [floors]);
  return (
    <group>
      {masses.map((m) => {
        const ey = explode && m.floorIndex >= 0 && m.floorIndex < 90 ? m.floorIndex * 2.4 : 0;
        if (selectedFloor !== null && selectedFloor < 0 && m.kind !== "basement") return null;
        if (cutaway && !explode && selectedFloor !== null && selectedFloor >= 0 && m.floorIndex > selectedFloor && m.kind !== "core") return null;
        if (m.kind === "pilotis") {
          return (
            <group key={m.id} position={[m.x, m.y + ey, m.z]}>
              <Columns width={m.width} depth={m.depth} height={m.height} />
              <mesh position={[0, m.height - 0.1, 0]} material={concrete}><boxGeometry args={[m.width + 0.18, 0.22, m.depth + 0.18]} /></mesh>
            </group>
          );
        }
        if (m.kind === "core") {
          if (interiors) return null;
          return <mesh key={m.id} position={[m.x, m.y + m.height / 2, m.z]} material={coreMat}><boxGeometry args={[m.width, m.height, m.depth]} /></mesh>;
        }
        if (m.kind === "basement") {
          const viewingGarage = selectedFloor !== null && selectedFloor < 0;
          if (!viewingGarage) return <mesh key={m.id} position={[m.x, m.y + m.height / 2, m.z]} material={concrete}><boxGeometry args={[m.width, m.height, m.depth]} /></mesh>;
          const split = m.floorIndex === -2 ? -2.6 : 0;
          return <BasementInterior key={m.id} mass={{ ...m, y: m.y + split }} inputs={inputs} inspect count={parkingFor.get(m.id) ?? 0} />;
        }
        const floor = floorByIndex.get(m.floorIndex);
        if (interiors && floor) return <FloorInterior key={m.id} floor={floor} explodeY={ey} selected={selectedFloor === m.floorIndex} selectedUnitId={selectedUnitId} />;
        const mat = m.kind === "commercial" ? stone : m.floorIndex === 0 ? marble : plasterM;
        const sortedUnits = floor ? [...floor.units].sort((a, b) => a.x - b.x) : [];
        const partitions = sortedUnits.slice(0, -1).map((u, i) => (u.x + u.width / 2 + sortedUnits[i + 1]!.x - sortedUnits[i + 1]!.width / 2) / 2 - m.x);
        return (
          <group key={m.id} position={[m.x, ey, m.z]}>
            <mesh position={[0, m.y + m.height / 2, 0]} material={mat}><boxGeometry args={[m.width, m.height, m.depth]} /></mesh>
            <Cornice width={m.width} depth={m.depth} y={m.y + m.height - 0.04} />
            <FacadeWindows width={m.width} height={m.height} depth={m.depth} y0={m.y} shop={m.kind === "commercial"} door={m.kind === "typical" && m.floorIndex === 0} sides={m.kind !== "commercial"} />
            {m.kind !== "commercial" ? <Balcony width={m.width} y={m.y + 0.08} depth={m.depth} railDepth={inputs.balconyDepth} partitions={partitions} /> : <mesh position={[0, m.y + 2.55, -m.depth / 2 - 0.32]} material={concrete}><boxGeometry args={[m.width * 0.7, 0.1, 0.65]} /></mesh>}
          </group>
        );
      })}
      {top && !interiors ? (inputs.roofType === "pitched" ? <HipRoof mass={top} /> : <FlatRoof mass={top} />) : null}
      {core && inputs.roofType === "flat" && !interiors ? <mesh position={[core.x, core.y + core.height + 0.14, core.z]} material={coreMat}><boxGeometry args={[core.width * 0.7, 0.28, core.depth * 0.5]} /></mesh> : null}
      {inputs.garageDoor && firstBasement ? (
        <GarageRamps
          upper={firstBasement}
          lower={selectedFloor !== null && selectedFloor < 0 ? masses.filter((m) => m.kind === "basement" && m.floorIndex === -2).map((m) => ({ ...m, y: m.y - 2.6 }))[0] : masses.find((m) => m.kind === "basement" && m.floorIndex === -2)}
          inputs={inputs}
          open={selectedFloor !== null && selectedFloor < 0}
        />
      ) : null}
    </group>
  );
});
