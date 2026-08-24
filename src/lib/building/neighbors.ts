import { aabbOf, metersPerDegree, rotateYaw, type OsmBuilding } from "./geo.ts";

export type PlacedNeighbor = {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  heightSource: "osm" | "levels" | "estimate";
  color: string;
  label: string;
};

const COLORS = ["#e8dcc8", "#efe6d8", "#d7c09a", "#c8c4bc", "#d4c8b0", "#cfc3ae", "#ddd2c0"];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function neighborHeight(b: OsmBuilding): { height: number; source: PlacedNeighbor["heightSource"] } {
  if (b.height && b.height >= 5) return { height: Math.min(28, b.height), source: "osm" };
  if (b.levels && b.levels >= 1) return { height: Math.min(28, b.levels * 3), source: "levels" };
  return { height: 9, source: "estimate" };
}

export function placeNeighbors(
  origin: { lat: number; lon: number; id?: string },
  buildings: OsmBuilding[],
  plotW: number,
  plotD: number,
  heading = 0,
  place?: { lat: number; lon: number },
): PlacedNeighbor[] {
  const m = metersPerDegree(origin.lat);
  const placeLon = place?.lon ?? origin.lon;
  const placeLat = place?.lat ?? origin.lat;
  const ox = (origin.lon - placeLon) * m.lon;
  const oz = (origin.lat - placeLat) * m.lat;
  const out: PlacedNeighbor[] = [];
  for (const b of buildings) {
    if (origin.id && b.id === origin.id) continue;
    let x: number;
    let z: number;
    let width: number;
    let depth: number;
    if (b.points && b.points.length >= 3) {
      const rot = b.points.map((p) => rotateYaw(p.x - ox, p.z - oz, heading));
      const box = aabbOf(rot);
      x = box.x;
      z = box.z;
      width = Math.min(42, Math.max(5, box.width));
      depth = Math.min(42, Math.max(5, box.depth));
    } else {
      const rawX = (b.lon - origin.lon) * m.lon;
      const rawZ = (b.lat - origin.lat) * m.lat;
      const r = rotateYaw(rawX, rawZ, heading);
      x = r.x;
      z = r.z;
      width = Math.min(40, Math.max(5, b.width));
      depth = Math.min(40, Math.max(5, b.depth));
    }
    if (Math.hypot(x, z) > 70) continue;
    if (width < 5 || depth < 5) continue;
    const overlap =
      Math.abs(x) < plotW / 2 + width / 2 - 1.2 && Math.abs(z) < plotD / 2 + depth / 2 - 1.2;
    if (overlap) continue;
    const h = neighborHeight(b);
    const label = b.street
      ? `${b.street} ${b.housenumber ?? ""}`.trim()
      : b.buildingType ?? "κτίριο OSM";
    out.push({
      id: b.id,
      x,
      z,
      width,
      depth,
      height: h.height,
      heightSource: h.source,
      color: COLORS[hashId(b.id) % COLORS.length]!,
      label,
    });
    if (out.length >= 12) break;
  }
  return out;
}
