import { metersPerDegree, rotateYaw } from "@/lib/building/geo";
import { placeNeighbors } from "@/lib/building/neighbors";
import { useMassing, useProject } from "@/store/project";
import { memo, useMemo } from "react";
import * as THREE from "three";

const glass = new THREE.MeshLambertMaterial({ color: "#1c2836" });
const roof = new THREE.MeshLambertMaterial({ color: "#5c564e" });
const road = new THREE.MeshLambertMaterial({ color: "#3e4046" });
const mats = new Map<string, THREE.MeshLambertMaterial>();
function plaster(color: string) {
  let m = mats.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    mats.set(color, m);
  }
  return m;
}

export const Neighbors = memo(function Neighbors({
  plotWidth,
  plotDepth,
  hidden,
}: {
  plotWidth: number;
  plotDepth: number;
  hidden?: boolean;
}) {
  const lookup = useProject((s) => s.lookup);
  const buildingX = useMassing().buildingX;
  const buildingZ = useMassing().buildingZ;
  const placed = useMemo(() => {
    if (!lookup?.place) return [];
    const originB = lookup.building;
    const origin = originB
      ? { lat: originB.lat, lon: originB.lon, id: originB.id }
      : { lat: lookup.place.lat, lon: lookup.place.lon };
    const list = lookup.neighbors.length ? lookup.neighbors : lookup.candidates;
    return placeNeighbors(origin, list, plotWidth, plotDepth, lookup.heading ?? 0, lookup.place);
  }, [lookup, plotWidth, plotDepth]);

  const streets = useMemo(() => {
    if (!lookup?.place || !lookup.streets?.length) return [];
    const origin = lookup.building ?? lookup.place;
    const m = metersPerDegree(lookup.place.lat);
    const ox = (origin.lon - lookup.place.lon) * m.lon;
    const oz = (origin.lat - lookup.place.lat) * m.lat;
    const yaw = lookup.heading ?? 0;
    return lookup.streets.slice(0, 12).map((s) => ({
      ...s,
      points: s.points.slice(0, 8).map((p) => rotateYaw(p.x - ox, p.z - oz, yaw)),
    }));
  }, [lookup]);

  if (hidden || (placed.length === 0 && streets.length === 0)) return null;

  return (
    <group position={[buildingX, 0, buildingZ]}>
      {streets.map((s) =>
        s.points.slice(0, -1).map((p, i) => {
          const n = s.points[i + 1];
          if (!n) return null;
          const dx = n.x - p.x;
          const dz = n.z - p.z;
          const len = Math.hypot(dx, dz);
          if (len < 1) return null;
          const yaw = Math.atan2(dx, dz);
          return (
            <mesh
              key={`${s.id}-${i}`}
              position={[(p.x + n.x) / 2, 0.02, (p.z + n.z) / 2]}
              rotation={[0, yaw, 0]}
              material={road}
            >
              <boxGeometry args={[s.width, 0.05, len]} />
            </mesh>
          );
        }),
      )}
      {placed.map((n) => {
        const floors = Math.min(8, Math.max(2, Math.round(n.height / 3)));
        // Face the window band toward the plot rather than a fixed side —
        // otherwise neighbors to the side or behind show blank walls
        // toward the street and windows facing away from everything.
        const faceX = Math.abs(n.x) > Math.abs(n.z);
        const windowGeom: [number, number, number] = faceX ? [0.05, 0.85, n.depth * 0.72] : [n.width * 0.72, 0.85, 0.05];
        const windowX = faceX ? -Math.sign(n.x || 1) * (n.width / 2 + 0.03) : 0;
        const windowZ = faceX ? 0 : -Math.sign(n.z || 1) * (n.depth / 2 + 0.03);
        return (
          <group key={n.id} position={[n.x, 0, n.z]}>
            <mesh position={[0, n.height / 2, 0]} material={plaster(n.color)}>
              <boxGeometry args={[n.width, n.height, n.depth]} />
            </mesh>
            <mesh position={[0, n.height + 0.08, 0]} material={roof}>
              <boxGeometry args={[n.width - 0.25, 0.18, n.depth - 0.25]} />
            </mesh>
            {Array.from({ length: floors }, (_, f) => (
              <mesh
                key={f}
                position={[windowX, 1.15 + f * (n.height / floors), windowZ]}
                material={glass}
              >
                <boxGeometry args={windowGeom} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
});
