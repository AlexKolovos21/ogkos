export const STALL_W = 2.5;
export const STALL_D = 5;
export const AISLE = 5.5;
export const RAMP_W = 3.5;
export const MAX_GRADE = 0.16;
export const BASEMENT_H = 2.8;
export const LANDING = 3.5;

export type Stall = { x: number; z: number; rot: number };

export type RampSeg = { x: number; y0: number; z0: number; y1: number; z1: number };

export function rampLength(drop: number) {
  return Math.max(8, Math.abs(drop) / MAX_GRADE);
}

export function rampGrade(drop: number, length: number) {
  if (length <= 0.1) return 1;
  return Math.abs(drop) / length;
}

export function garageRamps(args: {
  cx: number;
  cz: number;
  width: number;
  depth: number;
  yStreet: number;
  yUpper: number;
  yLower?: number;
  side?: "left" | "right";
}): RampSeg[] {
  const x =
    (args.side ?? "left") === "right"
      ? args.cx + args.width / 2 - RAMP_W / 2 - 0.2
      : args.cx - args.width / 2 + RAMP_W / 2 + 0.2;
  const zFront = args.cz - args.depth / 2;
  const zBack = args.cz + args.depth / 2;
  const drop1 = args.yStreet - args.yUpper;
  const run1 = rampLength(drop1);
  const outdoor = Math.min(12, Math.max(8, run1 * 0.72));
  const indoor = Math.min(args.depth * 0.32, Math.max(3.2, run1 - outdoor));
  const segs: RampSeg[] = [
    { x, y0: args.yStreet, z0: zFront - outdoor, y1: args.yUpper, z1: zFront + indoor },
  ];
  if (args.yLower !== undefined) {
    const drop2 = args.yUpper - args.yLower;
    const run2 = rampLength(drop2);
    const z2a = zBack - 0.6;
    const z2b = Math.max(zFront + indoor + 2, z2a - run2);
    segs.push({ x, y0: args.yUpper, z0: z2a, y1: args.yLower, z1: z2b });
  }
  return segs;
}

export const STORE_W = 2.15;
export const STORE_D = 2.55;

export type StorageRoom = { x: number; z: number; width: number; depth: number };

export function packStorage(
  width: number,
  depth: number,
  ramp: boolean,
  side: "left" | "right" = "left",
): StorageRoom[] {
  const left = ramp && side === "left" ? RAMP_W + 0.45 : 0.35;
  const right = ramp && side === "right" ? RAMP_W + 0.45 : 0.35;
  const usable = width - left - right;
  const n = Math.max(1, Math.min(8, Math.floor(usable / (STORE_W + 0.12))));
  const z = depth / 2 - STORE_D / 2 - 0.12;
  const rooms: StorageRoom[] = [];
  for (let i = 0; i < n; i++) {
    rooms.push({
      x: -width / 2 + left + STORE_W / 2 + i * (STORE_W + 0.12),
      z,
      width: STORE_W,
      depth: STORE_D,
    });
  }
  return rooms;
}

export function packParking(
  width: number,
  depth: number,
  ramp: boolean,
  side: "left" | "right" = "left",
): { stalls: Stall[]; capacity: number } {
  const stalls: Stall[] = [];
  const left = ramp && side === "left" ? RAMP_W + 0.4 : 0.4;
  const right = ramp && side === "right" ? RAMP_W + 0.4 : 0.4;
  const usableW = width - left - right;
  const usableD = Math.max(STALL_W, depth - 0.8 - STORE_D);
  if (usableW < STALL_D * 0.85) return { stalls, capacity: 0 };

  const n = Math.max(0, Math.floor(usableD / STALL_W));
  const double = usableW >= STALL_D + AISLE + STALL_D * 0.85;

  for (let i = 0; i < n; i++) {
    const z = -depth / 2 + 0.5 + STALL_W / 2 + i * STALL_W;
    if (double) {
      stalls.push({ x: -width / 2 + left + STALL_D / 2, z, rot: 0 });
      stalls.push({ x: width / 2 - right - STALL_D / 2, z, rot: Math.PI });
    } else {
      stalls.push({ x: width / 2 - right - STALL_D / 2, z, rot: Math.PI });
    }
  }
  return { stalls, capacity: stalls.length };
}

export function takeStalls(stalls: Stall[], count: number) {
  return stalls.slice(0, Math.max(0, count));
}

export function splitParking(caps: number[], target: number): number[] {
  const out = caps.map(() => 0);
  let left = Math.max(0, target);
  while (left > 0) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      if (out[i] < (caps[i] ?? 0) && left > 0) {
        out[i] += 1;
        left -= 1;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}
