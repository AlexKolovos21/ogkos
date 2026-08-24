import { Suv } from "@/components/scene/suv";
import type { MassingResult, ProjectInputs } from "@/lib/building/types";
import { memo } from "react";
import * as THREE from "three";

const lampPost = new THREE.MeshLambertMaterial({ color: "#3a3c40" });
const lampGlow = new THREE.MeshLambertMaterial({ color: "#f2e6c4" });
const asphalt = new THREE.MeshLambertMaterial({ color: "#4a4b50" });
const lane = new THREE.MeshLambertMaterial({ color: "#d8d4c8" });
const curb = new THREE.MeshLambertMaterial({ color: "#d0c8ba" });
const grass = new THREE.MeshLambertMaterial({ color: "#5f7344" });
const earth = new THREE.MeshLambertMaterial({ color: "#b59f7e" });
const sidewalk = new THREE.MeshLambertMaterial({ color: "#c6bfb2" });
const bark = new THREE.MeshLambertMaterial({ color: "#4a3b2a" });
const canopy = new THREE.MeshLambertMaterial({ color: "#4e623c" });
const canopy2 = new THREE.MeshLambertMaterial({ color: "#435836" });
const plinth = new THREE.MeshLambertMaterial({ color: "#6d7884" });

function Tree({ position, scale = 1, alt }: { position: [number, number, number]; scale?: number; alt?: boolean }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.45, 0]} material={bark}><cylinderGeometry args={[0.11, 0.16, 0.9, 6]} /></mesh>
      <mesh position={[0, 1.45, 0]} material={alt ? canopy2 : canopy}><icosahedronGeometry args={[0.85, 0]} /></mesh>
      <mesh position={[0.25, 1.85, 0.1]} material={canopy}><icosahedronGeometry args={[0.5, 0]} /></mesh>
    </group>
  );
}

function Car({ position, rotationY, tone = 0 }: { position: [number, number, number]; rotationY: number; tone?: 0 | 1 | 2 }) {
  return <Suv position={position} rotationY={rotationY} tone={tone} />;
}

function GrassStrip({ x, z, width, depth }: { x: number; z: number; width: number; depth: number }) {
  if (width < 0.08 || depth < 0.08) return null;
  return (
    <mesh position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]} material={grass}>
      <planeGeometry args={[width, depth]} />
    </mesh>
  );
}

export const Entourage = memo(function Entourage({
  inputs, result, inspectBasement, pitY,
}: { inputs: ProjectInputs; result: MassingResult; inspectBasement?: boolean; pitY?: number }) {
  const { plotWidth: w, plotDepth: d } = inputs;
  const front = -d / 2;
  const rearZ = result.buildingZ + result.footprintDepth / 2 + 2.2;
  const showRearTree = rearZ < d / 2 - 1;
  const streetW = Math.max(w + 28, 42);
  const pitBottom = pitY ?? 0;
  const pitH = inspectBasement && pitBottom < -0.2 ? -pitBottom : 0;
  const holeW = Math.min(w - 0.9, result.footprintWidth + 0.5);
  const holeD = Math.min(d - 0.9, result.footprintDepth + 0.5);
  const hx = result.buildingX; const hz = result.buildingZ;
  const hl = Math.max(-w / 2, hx - holeW / 2);
  const hr = Math.min(w / 2, hx + holeW / 2);
  const hf = Math.max(front, hz - holeD / 2);
  const hb = Math.min(d / 2, hz + holeD / 2);
  const pitW = Math.max(1, hr - hl);
  const pitD = Math.max(1, hb - hf);
  const plinthH = inspectBasement && pitH > 0 ? pitH + 1.2 : 0.9;
  return (
    <group>
      <mesh position={[0, -plinthH / 2 - 0.08, 2]} material={plinth} receiveShadow={false}>
        <boxGeometry args={[streetW + 18, plinthH, d + 36]} />
      </mesh>
      {inspectBasement && pitH > 0 ? (
        <>
          <GrassStrip x={0} z={(front + hf) / 2} width={w} depth={Math.max(0.05, hf - front)} />
          <GrassStrip x={0} z={(hb + d / 2) / 2} width={w} depth={Math.max(0.05, d / 2 - hb)} />
          <GrassStrip x={(-w / 2 + hl) / 2} z={(hf + hb) / 2} width={Math.max(0.05, hl + w / 2)} depth={pitD} />
          <GrassStrip x={(hr + w / 2) / 2} z={(hf + hb) / 2} width={Math.max(0.05, w / 2 - hr)} depth={pitD} />
          <mesh position={[(hl + hr) / 2, pitBottom - 0.04, (hf + hb) / 2]} material={earth}>
            <boxGeometry args={[pitW + 0.4, 0.08, pitD + 0.4]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={grass}>
            <planeGeometry args={[w, d]} />
          </mesh>
          <mesh position={[result.buildingX, 0.02, result.buildingZ]} rotation={[-Math.PI / 2, 0, 0]} material={earth}>
            <planeGeometry args={[result.footprintWidth + 0.4, result.footprintDepth + 0.4]} />
          </mesh>
        </>
      )}
      <mesh position={[0, -0.02, front - 5]} material={asphalt}><boxGeometry args={[streetW, 0.1, 8.2]} /></mesh>
      <mesh position={[0, 0.01, front - 5]} material={lane}><boxGeometry args={[streetW * 0.7, 0.02, 0.12]} /></mesh>
      <mesh position={[0, 0.06, front - 1.05]} material={sidewalk}><boxGeometry args={[Math.max(w + 8, 18), 0.1, 1.7]} /></mesh>
      <mesh position={[0, 0.12, front - 0.28]} material={curb}><boxGeometry args={[Math.max(w + 2, 14), 0.12, 0.28]} /></mesh>
      {[-streetW * 0.22, streetW * 0.28].map((x) => (
        <group key={x} position={[x, 0, front - 1.15]}>
          <mesh position={[0, 2.1, 0]} material={lampPost}><cylinderGeometry args={[0.07, 0.09, 4.2, 6]} /></mesh>
          <mesh position={[0, 4.25, 0.25]} material={lampGlow}><boxGeometry args={[0.35, 0.12, 0.55]} /></mesh>
        </group>
      ))}
      {[-2.2, 0, 2.2, 4.4].map((x) => (
        <mesh key={x} position={[x, 0.03, front - 1.9]} material={lane}><boxGeometry args={[0.55, 0.03, 0.18]} /></mesh>
      ))}
      {showRearTree ? <Tree position={[result.buildingX + w * 0.18, 0, rearZ]} /> : null}
      {inputs.system === "detached" ? <Tree position={[-w / 2 + 1.3, 0, result.buildingZ]} alt /> : null}
      <Tree position={[-w / 2 - 2.2, 0, front - 0.8]} />
      <Tree position={[w / 2 + 2.4, 0, front - 0.6]} scale={0.85} alt />
      <Tree position={[-w / 2 - 6, 0, front + 4]} scale={1.15} />
      <Car position={[-4.2, 0.02, front - 4.6]} rotationY={Math.PI / 2} />
      <Car position={[5.6, 0.02, front - 4.6]} rotationY={Math.PI / 2} tone={1} />
      <Car position={[12.5, 0.02, front - 7.1]} rotationY={Math.PI / 2} tone={2} />
      {result.groundKind === "pilotis" && !inspectBasement ? (
        <Car position={[result.buildingX - 1.6, 0, result.buildingZ]} rotationY={Math.PI / 2} />
      ) : null}
    </group>
  );
});
