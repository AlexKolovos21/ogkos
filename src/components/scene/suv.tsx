import * as THREE from "three";

// Rainbow fleet — each car gets a distinct vivid hue instead of a neutral tone.
const RAINBOW = ["#e0453c", "#e8873a", "#e8c93a", "#3ea85a", "#3a7fe8", "#5a4ce8", "#a03ce8"];
const bodies = RAINBOW.map((c) => new THREE.MeshLambertMaterial({ color: c }));
const glass = new THREE.MeshLambertMaterial({ color: "#8ea0b0" });
const wheel = new THREE.MeshLambertMaterial({ color: "#1a1a1c" });
const trim = new THREE.MeshLambertMaterial({ color: "#20242a" });
const light = new THREE.MeshLambertMaterial({ color: "#e8dcc0" });
const tail = new THREE.MeshLambertMaterial({ color: "#c4433a" });

// Low, wide coupe-crossover silhouette (BYD Seal U-ish): sloped fastback
// roofline lower at the rear than the front, a low tapered nose, and a
// full-width light bar front and back instead of separate lamp pods.
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
  const body = bodies[((tone % bodies.length) + bodies.length) % bodies.length]!;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.4, 0]} material={body}>
        <boxGeometry args={[4.6, 0.58, 1.9]} />
      </mesh>
      <mesh position={[2.05, 0.32, 0]} material={body}>
        <boxGeometry args={[0.5, 0.42, 1.76]} />
      </mesh>
      <mesh position={[0.2, 0.98, 0]} material={glass}>
        <boxGeometry args={[1.55, 0.48, 1.72]} />
      </mesh>
      <mesh position={[-1.15, 0.84, 0]} material={glass}>
        <boxGeometry args={[1.15, 0.4, 1.66]} />
      </mesh>
      <mesh position={[0.2, 1.24, 0]} material={trim}>
        <boxGeometry args={[1.7, 0.06, 1.78]} />
      </mesh>
      <mesh position={[2.28, 0.48, 0]} material={light}>
        <boxGeometry args={[0.08, 0.09, 1.5]} />
      </mesh>
      <mesh position={[-2.28, 0.48, 0]} material={tail}>
        <boxGeometry args={[0.08, 0.12, 1.55]} />
      </mesh>
      {[1.55, -1.5].flatMap((dx) =>
        [0.86, -0.86].map((dz) => (
          <mesh key={`${dx}-${dz}`} position={[dx, 0.3, dz]} material={wheel}>
            <boxGeometry args={[0.6, 0.6, 0.3]} />
          </mesh>
        )),
      )}
    </group>
  );
}
