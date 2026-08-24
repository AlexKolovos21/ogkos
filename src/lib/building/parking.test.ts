import assert from "node:assert/strict";
import test from "node:test";
import { garageRamps, packParking, packStorage, rampGrade, rampLength, STALL_W } from "./parking.ts";

test("ramp stays around 16%", () => {
  const drop = 2.8;
  const len = rampLength(drop);
  assert.ok(Math.abs(rampGrade(drop, len) - 0.16) < 0.01);
  assert.ok(len > 15);
});

test("garage ramp starts on the street and is driveable", () => {
  const segs = garageRamps({
    cx: 0,
    cz: 2,
    width: 12,
    depth: 16,
    yStreet: 0,
    yUpper: -2.8,
  });
  assert.equal(segs.length, 1);
  const s = segs[0]!;
  assert.ok(s.z0 < 2 - 16 / 2, "starts outside the basement");
  const run = Math.abs(s.z1 - s.z0);
  assert.ok(rampGrade(2.8, run) <= 0.17);
});

test("two levels get a switchback", () => {
  const segs = garageRamps({
    cx: 0,
    cz: 0,
    width: 14,
    depth: 20,
    yStreet: 0,
    yUpper: -2.8,
    yLower: -5.6,
  });
  assert.equal(segs.length, 2);
  assert.ok(segs[1]!.y1 < segs[0]!.y1);
});

test("12m plot with ramp still parks cars", () => {
  const p = packParking(12, 16, true);
  assert.ok(p.capacity >= 3);
  assert.ok(p.stalls.every((s) => Math.abs(s.x) <= 6));
});

test("wide basement double-loads", () => {
  const p = packParking(18, 20, true);
  assert.ok(p.capacity >= Math.floor(16 / STALL_W));
});

test("storage rooms sit at the back", () => {
  const rooms = packStorage(12, 16, true);
  assert.ok(rooms.length >= 2);
  assert.ok(rooms.every((r) => r.z > 3));
});
