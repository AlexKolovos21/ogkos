import { BuildingMesh } from "@/components/scene/building-mesh";
import { Entourage } from "@/components/scene/entourage";
import { Neighbors } from "@/components/scene/neighbors";
import type { ViewMode } from "@/lib/building/types";
import { useMassing, useProject } from "@/store/project";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

function goalFor(
  view: ViewMode,
  plotW: number,
  plotD: number,
  height: number,
  pitY?: number,
): { pos: THREE.Vector3; target: THREE.Vector3 } {
  if (pitY !== undefined && pitY < -0.2) {
    const d = Math.max(plotW, plotD, 12);
    return {
      pos: new THREE.Vector3(d * 0.55, 11, -plotD / 2 - 9),
      target: new THREE.Vector3(0, pitY * 0.35, 0),
    };
  }
  const d = Math.max(plotW, plotD, height, 12) * 1.65;
  switch (view) {
    case "front":
      return {
        pos: new THREE.Vector3(0, Math.max(6, height * 0.55), -plotD / 2 - d * 0.62),
        target: new THREE.Vector3(0, height * 0.38, 0),
      };
    case "side":
      return {
        pos: new THREE.Vector3(plotW / 2 + d * 0.65, Math.max(6, height * 0.55), 0),
        target: new THREE.Vector3(0, height * 0.38, 0),
      };
    case "top":
      return {
        pos: new THREE.Vector3(0, Math.max(d * 2.2, height * 4.5, 48), 0.3),
        target: new THREE.Vector3(0, 0, 0),
      };
    default:
      return {
        pos: new THREE.Vector3(d * 0.95, height * 1.15 + 14, d * 1.15),
        target: new THREE.Vector3(0, height * 0.22, 0),
      };
  }
}

function CameraRig() {
  const view = useProject((s) => s.view);
  const autoRotate = useProject((s) => s.autoRotate);
  const plotWidth = useProject((s) => s.inputs.plotWidth);
  const plotDepth = useProject((s) => s.inputs.plotDepth);
  const selectedFloor = useProject((s) => s.selectedFloor);
  const massing = useMassing();
  const height = massing.totalHeight;
  const basements = massing.masses.filter((m) => m.kind === "basement");
  const pitY =
    selectedFloor !== null && selectedFloor < 0
      ? Math.min(...basements.map((m) => m.y), -2.8) - (basements.length >= 2 ? 2.6 : 0)
      : undefined;
  const controls = useRef<any>(null);
  const animating = useRef(false);
  const booted = useRef(false);
  const posGoal = useRef(new THREE.Vector3());
  const tgtGoal = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    const g = goalFor(view, plotWidth, plotDepth, height, pitY);
    posGoal.current.copy(g.pos);
    tgtGoal.current.copy(g.target);
    if (!booted.current) return;
    animating.current = true;
  }, [view, selectedFloor]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    if (!booted.current) {
      const g = goalFor(view, plotWidth, plotDepth, height, pitY);
      c.object.position.copy(g.pos);
      c.target.copy(g.target);
      c.update();
      booted.current = true;
      return;
    }
    c.autoRotate = autoRotate && !animating.current;
    if (!animating.current) return;
    const k = 1 - Math.exp(-Math.min(delta, 0.08) * 5);
    c.object.position.lerp(posGoal.current, k);
    c.target.lerp(tgtGoal.current, k);
    c.update();
    if (tmp.current.copy(c.object.position).sub(posGoal.current).length() < 0.12) {
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 + 0.12}
      minPolarAngle={0.05}
      minDistance={3}
      maxDistance={200}
      autoRotateSpeed={0.4}
      rotateSpeed={0.85}
      onStart={() => {
        animating.current = false;
      }}
    />
  );
}

function SceneContent() {
  const inputs = useProject((s) => s.inputs);
  const explode = useProject((s) => s.explode);
  const selectedFloor = useProject((s) => s.selectedFloor);
  const selectedUnitId = useProject((s) => s.selectedUnitId);
  const result = useMassing();

  return (
    <>
      <color attach="background" args={["#6f8496"]} />
      <fog attach="fog" args={["#6f8496", selectedFloor !== null && selectedFloor < 0 ? 90 : 78, 220]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#dbe6f2", "#6e6254", 0.85]} />
      <directionalLight color="#fff4de" intensity={1.55} position={[26, 38, 14]} />
      <directionalLight color="#8aa0b6" intensity={0.38} position={[-16, 8, -12]} />
      {selectedFloor !== null && selectedFloor < 0 ? (
        <pointLight color="#fff4dc" intensity={55} distance={36} position={[0, 6, result.buildingZ - 1]} />
      ) : null}
      <Entourage
        inputs={inputs}
        result={result}
        inspectBasement={selectedFloor !== null && selectedFloor < 0}
        pitY={
          selectedFloor !== null && selectedFloor < 0
            ? Math.min(...result.masses.filter((m) => m.kind === "basement").map((m) => m.y), -2.8) -
              (result.masses.filter((m) => m.kind === "basement").length >= 2 ? 2.6 : 0)
            : undefined
        }
      />
      <Neighbors plotWidth={inputs.plotWidth} plotDepth={inputs.plotDepth} hidden={selectedFloor !== null && selectedFloor < 0} />
      <BuildingMesh
        masses={result.masses}
        floors={result.floors}
        inputs={inputs}
        explode={explode}
        selectedFloor={selectedFloor}
        selectedUnitId={selectedUnitId}
        parkingSpaces={result.parkingSpaces}
      />
      <CameraRig />
    </>
  );
}

export default function BuildingScene() {
  return (
    <Canvas
      dpr={1}
      gl={{ antialias: true, alpha: false, powerPreference: "default", stencil: false, depth: true, failIfMajorPerformanceCaveat: false }}
      camera={{ position: [36, 26, 42], fov: 36, near: 0.5, far: 280 }}
      style={{ touchAction: "none", width: "100%", height: "100%" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#6f8496", 1);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.setPixelRatio(1);
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
