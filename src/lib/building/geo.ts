export type GeoPoint = { lon: number; lat: number };

export type OsmBuilding = {
  id: string;
  street?: string;
  housenumber?: string;
  width: number;
  depth: number;
  area: number;
  height?: number;
  levels?: number;
  buildingType?: string;
  distanceM: number;
  lat: number;
  lon: number;
  points: { x: number; z: number }[];
};

export function osmTile(lat: number, lon: number, z: number): { x: number; y: number; z: number } {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y, z };
}

export function extractHouseNumber(query: string): string | null {
  const tokens = [...query.matchAll(/\d+[Α-Ωα-ωA-Za-z]?/g)].map((m) => m[0]);
  const house = tokens.find((t) => t.replace(/\D/g, "").length <= 3);
  return house ?? null;
}

export function metersPerDegree(lat: number): { lat: number; lon: number } {
  const latM = 111_320;
  const lonM = 111_320 * Math.cos((lat * Math.PI) / 180);
  return { lat: latM, lon: lonM };
}

export function distanceM(a: GeoPoint, b: GeoPoint): number {
  const m = metersPerDegree((a.lat + b.lat) / 2);
  return Math.hypot((a.lon - b.lon) * m.lon, (a.lat - b.lat) * m.lat);
}

export function polygonAreaM2(pts: GeoPoint[]): number {
  if (pts.length < 3) return 0;
  const m = metersPerDegree(pts[0].lat);
  const origin = pts[0];
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const xi = (pts[i].lon - origin.lon) * m.lon;
    const yi = (pts[i].lat - origin.lat) * m.lat;
    const xj = (pts[j].lon - origin.lon) * m.lon;
    const yj = (pts[j].lat - origin.lat) * m.lat;
    sum += xi * yj - xj * yi;
  }
  return Math.abs(sum) / 2;
}

export function bboxMeters(pts: GeoPoint[]): { width: number; depth: number; lat: number; lon: number } {
  const lons = pts.map((p) => p.lon);
  const lats = pts.map((p) => p.lat);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const m = metersPerDegree(lat);
  return {
    width: round1((Math.max(...lons) - Math.min(...lons)) * m.lon),
    depth: round1((Math.max(...lats) - Math.min(...lats)) * m.lat),
    lat,
    lon,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function rotateYaw(x: number, z: number, yaw: number): { x: number; z: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x * c + z * s, z: -x * s + z * c };
}

export function yawToFront(fx: number, fz: number): number {
  return Math.PI - Math.atan2(fx, fz);
}

export function aabbOf(points: { x: number; z: number }[]): { x: number; z: number; width: number; depth: number } {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: Math.max(0.5, maxX - minX), depth: Math.max(0.5, maxZ - minZ) };
}

export type OsmStreet = {
  id: string;
  kind: string;
  width: number;
  points: { x: number; z: number }[];
};

export function streetFront(streets: OsmStreet[], x: number, z: number): { fx: number; fz: number; dist: number } | null {
  let bestD = Infinity;
  let bx = 0;
  let bz = 0;
  for (const s of streets) {
    for (let i = 0; i < s.points.length - 1; i++) {
      const a = s.points[i]!;
      const b = s.points[i + 1]!;
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const den = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / den));
      const px = a.x + t * abx;
      const pz = a.z + t * abz;
      const d = Math.hypot(x - px, z - pz);
      if (d < bestD) {
        bestD = d;
        bx = px;
        bz = pz;
      }
    }
  }
  if (!Number.isFinite(bestD) || bestD > 70) return null;
  const fx = bx - x;
  const fz = bz - z;
  const len = Math.hypot(fx, fz) || 1;
  return { fx: fx / len, fz: fz / len, dist: bestD };
}

export function parseOsmMap(xml: string, center: GeoPoint): { buildings: OsmBuilding[]; streets: OsmStreet[] } {
  const nodes = new Map<string, GeoPoint>();
  const nodeRe = /<node\b([^>]*)\/?>/g;
  let nm: RegExpExecArray | null;
  while ((nm = nodeRe.exec(xml))) {
    const attrs = nm[1];
    const id = attr(attrs, "id");
    const lat = Number(attr(attrs, "lat"));
    const lon = Number(attr(attrs, "lon"));
    if (id && Number.isFinite(lat) && Number.isFinite(lon)) nodes.set(id, { lat, lon });
  }
  const m = metersPerDegree(center.lat);
  const buildings: OsmBuilding[] = [];
  const streets: OsmStreet[] = [];
  const wayRe = /<way\b([^>]*)>([\s\S]*?)<\/way>/g;
  let wm: RegExpExecArray | null;
  while ((wm = wayRe.exec(xml))) {
    const body = wm[2];
    const tags: Record<string, string> = {};
    const tagRe = /<tag\b([^>]*)\/?>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tagRe.exec(body))) {
      const k = attr(tm[1], "k");
      const v = attr(tm[1], "v");
      if (k) tags[k] = v ?? "";
    }
    const nds: GeoPoint[] = [];
    const ndRe = /<nd\b([^>]*)\/?>/g;
    let dm: RegExpExecArray | null;
    while ((dm = ndRe.exec(body))) {
      const ref = attr(dm[1], "ref");
      const p = ref ? nodes.get(ref) : undefined;
      if (p) nds.push(p);
    }
    const id = attr(wm[1], "id") ?? String(buildings.length + streets.length);
    if (tags.highway && nds.length >= 2) {
      const kind = tags.highway;
      if (!/footway|path|steps|cycleway|track|bridleway/.test(kind)) {
        streets.push({
          id,
          kind,
          width: streetWidth(kind),
          points: nds.map((p) => ({ x: (p.lon - center.lon) * m.lon, z: (p.lat - center.lat) * m.lat })),
        });
      }
      continue;
    }
    if (!tags.building || tags.building === "no" || nds.length < 3) continue;
    if (/^(garage|garages|shed|roof|ruins|collapsed|construction|kiosk|carport|hangar|container|service|terrace|greenhouse)$/.test(tags.building)) continue;
    const area = round1(polygonAreaM2(nds));
    if (area < 40) continue;
    const box = bboxMeters(nds);
    const height = parseOptionalNumber(tags.height);
    const levels = parseOptionalNumber(tags["building:levels"]);
    const mLocal = metersPerDegree(center.lat);
    const points = nds.map((p) => ({ x: (p.lon - center.lon) * mLocal.lon, z: (p.lat - center.lat) * mLocal.lat }));
    buildings.push({
      id, street: tags["addr:street"], housenumber: tags["addr:housenumber"],
      width: Math.max(0.5, box.width), depth: Math.max(0.5, box.depth), area,
      height, levels, buildingType: tags.building === "yes" ? undefined : tags.building,
      distanceM: round1(distanceM(center, { lat: box.lat, lon: box.lon })), lat: box.lat, lon: box.lon, points,
    });
  }
  buildings.sort((a, b) => a.distanceM - b.distanceM);
  return { buildings, streets };
}

export function parseOsmMapXml(xml: string, center: GeoPoint): OsmBuilding[] {
  return parseOsmMap(xml, center).buildings;
}

function streetWidth(kind: string): number {
  if (kind === "primary" || kind === "trunk") return 10;
  if (kind === "secondary") return 8;
  if (kind === "tertiary") return 7;
  if (kind === "residential" || kind === "unclassified" || kind === "living_street") return 6.2;
  if (kind === "service") return 4;
  if (kind === "pedestrian") return 5;
  return 6;
}

function parseOptionalNumber(v?: string): number | undefined {
  if (!v) return undefined;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function attr(src: string, name: string): string | undefined {
  const m = src.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m?.[1];
}

export function pickBuilding(buildings: OsmBuilding[], house?: string | null, street?: string | null): OsmBuilding | null {
  if (buildings.length === 0) return null;
  if (house) {
    const norm = house.toLowerCase();
    const hits = buildings.filter((b) => b.housenumber && b.housenumber.toLowerCase() === norm);
    if (street && hits.length > 1) {
      const st = street.toLowerCase();
      const named = hits.filter((b) => (b.street ?? "").toLowerCase().includes(st.slice(0, 6)));
      if (named[0]) return named[0];
    }
    if (hits[0]) return hits[0];
  }
  // No house-number hit: prefer a building actually tagged with the right
  // street over blindly taking the nearest one, which can be on a
  // different street (e.g. a corner plot) when no address tags matched.
  if (street) {
    const st = street.toLowerCase();
    const named = buildings.filter((b) => (b.street ?? "").toLowerCase().includes(st.slice(0, 6)));
    if (named[0]) return named[0];
  }
  return buildings[0] ?? null;
}

export function houseMatched(building: OsmBuilding | null, house?: string | null): boolean {
  if (!building || !house || !building.housenumber) return false;
  return building.housenumber.toLowerCase() === house.toLowerCase();
}
