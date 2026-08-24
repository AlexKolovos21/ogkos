import type { Apartment, ExtraRoom, FloorInfo, FloorProgram, Mass, ProjectInputs, Room, RoomKind, WallSeg } from "./types.ts";
import { ROOM_LABELS, UNIT_COLORS } from "./types.ts";

const LETTERS = ["Α", "Β", "Γ", "Δ", "Ε", "ΣΤ", "Ζ", "Η", "Θ", "Ι", "ΙΑ", "ΙΒ", "ΙΓ", "ΙΔ"];
const MIN_APT = 28;
const MAX_UNITS = 4;
const NET = 0.84;

export type Rect = { x: number; z: number; width: number; depth: number };

export function bedroomsFor(area: number): number {
  if (area < 42) return 0;
  if (area < 62) return 1;
  if (area < 85) return 2;
  if (area < 115) return 3;
  return 4;
}

export function floorLetter(habitableIndex: number): string {
  return LETTERS[Math.max(0, Math.min(LETTERS.length - 1, habitableIndex))] ?? "Α";
}

export function maxAptsFor(plateArea: number): number {
  return Math.max(1, Math.min(MAX_UNITS, Math.floor((plateArea * NET) / MIN_APT)));
}

export function resolveProgram(inputs: ProjectInputs, habIndex: number, plateArea: number): FloorProgram {
  const max = maxAptsFor(plateArea);
  const override = inputs.floorPrograms?.[String(habIndex)];
  const fallback = Math.max(1, Math.min(max, Math.round(inputs.aptsPerFloor || 2)));
  const count = Math.max(1, Math.min(max, Math.round(override?.count ?? fallback)));
  const equal = round1((plateArea * NET) / count);
  const raw = override?.areas ?? [];
  const areas = Array.from({ length: count }, (_, i) => {
    const v = raw[i];
    return Number.isFinite(v) && v >= MIN_APT ? v : equal;
  });
  return { count, areas, bedrooms: override?.bedrooms?.slice(0, count), extras: override?.extras?.slice(0, count) };
}

export function packByAreas(targets: number[], fw: number, fd: number): Rect[] {
  const n = Math.max(1, Math.min(MAX_UNITS, targets.length));
  const weights = targets.slice(0, n).map((t) => Math.max(MIN_APT, t));
  const sum = weights.reduce((a, b) => a + b, 0) || n;
  if (n === 1) return [{ x: 0, z: 0, width: fw, depth: fd }];
  if (n === 2) {
    const w0 = fw * (weights[0] / sum);
    const w1 = fw - w0;
    return [
      { x: -fw / 2 + w0 / 2, z: 0, width: w0, depth: fd },
      { x: fw / 2 - w1 / 2, z: 0, width: w1, depth: fd },
    ];
  }
  if (n === 3) {
    const frontW = weights[0] + weights[1];
    const frontD = fd * (frontW / sum);
    const rearD = Math.max(2.4, fd - frontD);
    const w0 = fw * (weights[0] / frontW);
    const w1 = fw - w0;
    return [
      { x: -fw / 2 + w0 / 2, z: -fd / 2 + frontD / 2, width: w0, depth: frontD },
      { x: fw / 2 - w1 / 2, z: -fd / 2 + frontD / 2, width: w1, depth: frontD },
      { x: 0, z: fd / 2 - rearD / 2, width: fw, depth: rearD },
    ];
  }
  const top = weights[0] + weights[1];
  const bot = weights[2] + weights[3];
  const d0 = fd * (top / sum);
  const d1 = fd - d0;
  const w00 = fw * (weights[0] / top);
  const w01 = fw - w00;
  const w10 = fw * (weights[2] / bot);
  const w11 = fw - w10;
  return [
    { x: -fw / 2 + w00 / 2, z: -fd / 2 + d0 / 2, width: w00, depth: d0 },
    { x: fw / 2 - w01 / 2, z: -fd / 2 + d0 / 2, width: w01, depth: d0 },
    { x: -fw / 2 + w10 / 2, z: fd / 2 - d1 / 2, width: w10, depth: d1 },
    { x: fw / 2 - w11 / 2, z: fd / 2 - d1 / 2, width: w11, depth: d1 },
  ];
}

export function partyWallsFromRects(rects: Rect[]): WallSeg[] {
  const t = 0.14;
  const walls: WallSeg[] = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) pushShared(walls, rects[i], rects[j], t);
  }
  return walls;
}

function pushShared(walls: WallSeg[], a: Rect, b: Rect, t: number) {
  const edges = [
    { ax: a.x + a.width / 2, bx: b.x - b.width / 2 },
    { ax: a.x - a.width / 2, bx: b.x + b.width / 2 },
  ];
  for (const e of edges) {
    if (Math.abs(e.ax - e.bx) < 0.12) {
      const z1 = Math.max(a.z - a.depth / 2, b.z - b.depth / 2);
      const z2 = Math.min(a.z + a.depth / 2, b.z + b.depth / 2);
      if (z2 - z1 > 0.35) walls.push({ x: (e.ax + e.bx) / 2, z: (z1 + z2) / 2, width: t, depth: z2 - z1 });
    }
  }
  const hedges = [
    { az: a.z + a.depth / 2, bz: b.z - b.depth / 2 },
    { az: a.z - a.depth / 2, bz: b.z + b.depth / 2 },
  ];
  for (const e of hedges) {
    if (Math.abs(e.az - e.bz) < 0.12) {
      const x1 = Math.max(a.x - a.width / 2, b.x - b.width / 2);
      const x2 = Math.min(a.x + a.width / 2, b.x + b.width / 2);
      if (x2 - x1 > 0.35) walls.push({ x: (x1 + x2) / 2, z: (e.az + e.bz) / 2, width: x2 - x1, depth: t });
    }
  }
}

function envelopeWalls(fw: number, fd: number): WallSeg[] {
  const t = 0.16;
  return [
    { x: 0, z: -fd / 2 + t / 2, width: fw, depth: t },
    { x: 0, z: fd / 2 - t / 2, width: fw, depth: t },
    { x: -fw / 2 + t / 2, z: 0, width: t, depth: fd },
    { x: fw / 2 - t / 2, z: 0, width: t, depth: fd },
  ];
}

function room(kind: RoomKind, x: number, z: number, width: number, depth: number): Room {
  return { kind, label: ROOM_LABELS[kind], x, z, width, depth };
}

export function extraRooms(extras: ExtraRoom[] | undefined, w: number, d: number): Room[] {
  if (!extras?.length) return [];
  return extras.map((e, i) => {
    const width = Math.min(Math.max(1.4, e.width), w * 0.48);
    const depth = Math.min(Math.max(1.4, e.depth), d * 0.38);
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = -w / 2 + 0.35 + width / 2 + col * (width + 0.18);
    const z = d / 2 - 0.28 - depth / 2 - row * (depth + 0.18);
    return room(e.kind, x, z, width, depth);
  });
}

export function layoutRooms(w: number, d: number, bedrooms: number, shop: boolean): Room[] {
  if (shop) return [room("shop", 0, 0, w * 0.86, d * 0.86)];
  const livingD = Math.min(Math.max(d * 0.34, 3.0), d * 0.46);
  const kitW = Math.min(3.4, Math.max(2.2, w * 0.32));
  const rooms: Room[] = [
    room("living", -w * 0.08, -d / 2 + livingD / 2, Math.max(2.6, w - kitW - 0.35), livingD * 0.9),
    room("kitchen", w / 2 - kitW / 2 - 0.12, -d / 2 + livingD / 2, kitW * 0.9, livingD * 0.9),
  ];
  const restD = Math.max(2.2, d - livingD);
  const restZ = -d / 2 + livingD + restD / 2;
  const beds = Math.max(0, bedrooms);
  if (beds === 0) {
    rooms.push(room("bath", w / 2 - 1.05, restZ, 1.8, Math.min(2.2, restD * 0.7)));
    return rooms;
  }
  const cols = Math.min(2, beds);
  const bedW = (w - 0.35) / cols;
  const bedD = restD * (beds > 2 ? 0.55 : 0.68);
  for (let i = 0; i < beds; i++) {
    if (i < 2) rooms.push(room("bed", -w / 2 + 0.18 + bedW * (i + 0.5), -d / 2 + livingD + bedD / 2, bedW * 0.86, bedD * 0.86));
    else rooms.push(room("bed", -w / 2 + w * 0.38, restZ + restD * 0.14, w * 0.38, Math.max(2.1, restD * 0.3)));
  }
  rooms.push(room("bath", w / 2 - 1.0, restZ + restD * 0.1, 1.7, Math.min(2.15, restD * 0.42)));
  return rooms;
}

export function roomWalls(w: number, d: number, bedrooms: number, shop: boolean): WallSeg[] {
  if (shop) return [];
  const t = 0.1;
  const livingD = Math.min(Math.max(d * 0.34, 3.0), d * 0.46);
  const kitW = Math.min(3.4, Math.max(2.2, w * 0.32));
  const walls: WallSeg[] = [
    { x: 0, z: -d / 2 + livingD, width: w - 0.4, depth: t },
    { x: w / 2 - kitW, z: -d / 2 + livingD / 2, width: t, depth: livingD - 0.15 },
  ];
  if (bedrooms >= 1) {
    const restD = Math.max(2.2, d - livingD);
    const bedD = restD * (bedrooms > 2 ? 0.55 : 0.68);
    walls.push({ x: 0, z: -d / 2 + livingD + bedD, width: w * 0.7, depth: t });
    if (bedrooms >= 2) walls.push({ x: 0, z: -d / 2 + livingD + bedD / 2, width: t, depth: bedD - 0.1 });
  }
  return walls;
}

function floorNameFor(kind: Mass["kind"], habitableIndex: number, isGroundHousing: boolean, floorIndex: number, basementLevels: number): string {
  if (kind === "basement") {
    if (basementLevels >= 2) return floorIndex === -2 ? "Υπόγειο 2" : "Υπόγειο 1";
    return "Υπόγειο";
  }
  if (kind === "pilotis") return "Πιλοτή";
  if (kind === "commercial") return "Καταστήματα";
  if (kind === "recessed") return "Ρετιρέ";
  if (isGroundHousing) return "Ισόγειο";
  return `Όροφος ${floorLetter(habitableIndex)}`;
}

function unitPrefix(kind: Mass["kind"], habitableIndex: number, isGroundHousing: boolean): string {
  if (kind === "commercial") return "Κ";
  if (kind === "recessed") return "Ρ";
  if (isGroundHousing) return "Ι";
  return floorLetter(habitableIndex);
}

export function buildProgram(masses: Mass[], inputs: ProjectInputs): FloorInfo[] {
  let hab = 0;
  const floors: FloorInfo[] = [];
  for (const m of masses) {
    if (m.kind === "core") continue;
    const isGroundHousing = m.kind === "typical" && m.floorIndex === 0 && !inputs.pilotis;
    const habIndex = m.kind === "typical" || m.kind === "recessed" ? hab : -1;
    const name = floorNameFor(m.kind, Math.max(0, habIndex), isGroundHousing, m.floorIndex, inputs.basement ? (inputs.basementLevels >= 2 ? 2 : 1) : 0);
    if (m.kind === "typical" || m.kind === "recessed") hab += 1;
    const netArea = round1(m.width * m.depth * NET);
    if (m.kind === "basement" || m.kind === "pilotis") {
      floors.push({ index: m.floorIndex, habIndex: -1, name, kind: m.kind, y: m.y, height: m.height, width: m.width, depth: m.depth, x: m.x, z: m.z, netArea, units: [], walls: envelopeWalls(m.width, m.depth) });
      continue;
    }
    const plate = m.width * m.depth;
    const program = m.kind === "commercial" ? { count: Math.max(1, Math.min(2, inputs.aptsPerFloor)), areas: [] as number[] } : resolveProgram(inputs, habIndex, plate);
    const shop = m.kind === "commercial";
    const rects = packByAreas(program.areas.length === program.count ? program.areas : Array.from({ length: program.count }, () => netArea / program.count), m.width, m.depth);
    const prefix = unitPrefix(m.kind, Math.max(0, habIndex), isGroundHousing);
    const walls = [...envelopeWalls(m.width, m.depth), ...partyWallsFromRects(rects)];
    const units: Apartment[] = rects.map((r, i) => {
      const area = round1(r.width * r.depth * NET);
      const overrideBeds = program.bedrooms?.[i];
      const bedrooms = shop ? 0 : overrideBeds !== undefined && overrideBeds >= 0 ? Math.max(0, Math.min(4, overrideBeds)) : bedroomsFor(area);
      return {
        id: `${m.id}-u${i + 1}`, label: `${prefix}${i + 1}`, floorIndex: m.floorIndex, floorName: name,
        area, targetArea: program.areas[i] ?? area, bedrooms,
        x: m.x + r.x, y: m.y, z: m.z + r.z, width: r.width, depth: r.depth,
        color: UNIT_COLORS[i % UNIT_COLORS.length],
        rooms: [...layoutRooms(r.width, r.depth, bedrooms, shop), ...extraRooms(program.extras?.[i], r.width, r.depth)],
        walls: roomWalls(r.width, r.depth, bedrooms, shop),
      };
    });
    floors.push({ index: m.floorIndex, habIndex, name, kind: m.kind, y: m.y, height: m.height, width: m.width, depth: m.depth, x: m.x, z: m.z, netArea, units, walls });
  }
  return floors;
}

export function unitsOverlap(a: Rect, b: Rect): boolean {
  const ax1 = a.x - a.width / 2; const ax2 = a.x + a.width / 2;
  const az1 = a.z - a.depth / 2; const az2 = a.z + a.depth / 2;
  const bx1 = b.x - b.width / 2; const bx2 = b.x + b.width / 2;
  const bz1 = b.z - b.depth / 2; const bz2 = b.z + b.depth / 2;
  return ax1 < bx2 - 0.05 && ax2 > bx1 + 0.05 && az1 < bz2 - 0.05 && az2 > bz1 + 0.05;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
