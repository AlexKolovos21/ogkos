import * as THREE from "three";

const bodyA = new THREE.MeshLambertMaterial({ color: "#5a6270" });
const bodyB = new THREE.MeshLambertMaterial({ color: "#6e3f2c" });
const bodyC = new THREE.MeshLambertMaterial({ color: "#3a4638" });
const bodyD = new THREE.MeshLambertMaterial({ color: "#2f3540" });
const glass = new THREE.MeshLambertMaterial({ color: "#8ea0b0" });
const wheel = new THREE.MeshLambertMaterial({ color: "#1a1a1c" });
const trim = new THREE.MeshLambertMaterial({ color: "#2c3036" });
const light = new THREE.MeshLambertMaterial({ color: "#e8dcc0" });
const bodies = [bodyA, bodyB, bodyC, bodyD];

export function Suv({
  position,
  rotationY = 0,
  tone = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotationY?: number;
  tone?: number;
  scale?: number;
}) {
  const body = bodies[tone % 4]!;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.52, 0]} material={body}>
        <boxGeometry args={[4.15, 0.72, 1.82]} />
      </mesh>
      <mesh position={[-0.18, 1.12, 0]} material={glass}>
        <boxGeometry args={[2.15, 0.62, 1.68]} />
      </mesh>
      <mesh position={[0.05, 1.46, 0]} material={trim}>
        <boxGeometry args={[2.35, 0.08, 1.72]} />
      </mesh>
      <mesh position={[1.55, 1.5, 0.42]} material={trim}>
        <boxGeometry args={[0.9, 0.05, 0.05]} />
      </mesh>
      <mesh position={[1.55, 1.5, -0.42]} material={trim}>
        <boxGeometry args={[0.9, 0.05, 0.05]} />
      </mesh>
      <mesh position={[1.95, 0.48, 0.62]} material={light}>
        <boxGeometry args={[0.12, 0.18, 0.38]} />
      </mesh>
      <mesh position={[1.95, 0.48, -0.62]} material={light}>
        <boxGeometry args={[0.12, 0.18, 0.38]} />
      </mesh>
      {[1.35, -1.3].flatMap((dx) =>
        [0.78, -0.78].map((dz) => (
          <mesh key={`${dx}-${dz}`} position={[dx, 0.32, dz]} material={wheel}>
            <boxGeometry args={[0.58, 0.62, 0.28]} />
          </mesh>
        )),
      )}
    </group>
  );
}
