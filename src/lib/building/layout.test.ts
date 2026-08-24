import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bedroomsFor, buildProgram, maxAptsFor, packByAreas, resolveProgram, unitsOverlap } from "./layout.ts";
import { DEFAULT_INPUTS } from "./presets.ts";
import type { Mass } from "./types.ts";

function floorMass(): Mass[] {
  return [
    { id: "pilotis", kind: "pilotis", width: 12, depth: 14, height: 2.8, x: 0, y: 0, z: 0, floorIndex: 0 },
    { id: "floor-0", kind: "typical", width: 12, depth: 14, height: 3, x: 0, y: 2.8, z: 0, floorIndex: 1 },
    { id: "floor-1", kind: "typical", width: 12, depth: 14, height: 3, x: 0, y: 5.8, z: 0, floorIndex: 2 },
    { id: "core", kind: "core", width: 2.6, depth: 5, height: 10, x: 0, y: 0, z: 4, floorIndex: 99 },
  ];
}

describe("bedroomsFor", () => {
  it("maps area to bedroom count", () => {
    assert.equal(bedroomsFor(30), 0);
    assert.equal(bedroomsFor(50), 1);
    assert.equal(bedroomsFor(70), 2);
    assert.equal(bedroomsFor(90), 3);
    assert.equal(bedroomsFor(130), 4);
  });
});

describe("maxAptsFor", () => {
  it("caps by net area and 4", () => {
    assert.equal(maxAptsFor(12 * 14), 4);
    assert.ok(maxAptsFor(8 * 8) <= 2);
    assert.equal(maxAptsFor(6 * 6), 1);
  });
});

describe("packByAreas", () => {
  it("two unequal units keep ratio and do not overlap", () => {
    const rects = packByAreas([90, 45], 12, 14);
    assert.equal(rects.length, 2);
    assert.equal(unitsOverlap(rects[0], rects[1]), false);
    const a0 = rects[0].width * rects[0].depth;
    const a1 = rects[1].width * rects[1].depth;
    assert.ok(a0 / a1 > 1.7 && a0 / a1 < 2.3);
    assert.ok(a0 + a1 >= 12 * 14 * 0.98);
  });
  it("four units fill the plate", () => {
    const rects = packByAreas([40, 40, 40, 40], 12, 14);
    assert.equal(rects.length, 4);
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        assert.equal(unitsOverlap(rects[i], rects[j]), false, `${i}-${j}`);
      }
    }
  });
});

describe("buildProgram", () => {
  it("skips the core and names floors", () => {
    const floors = buildProgram(floorMass(), { ...DEFAULT_INPUTS, aptsPerFloor: 2 });
    assert.equal(floors.some((f) => f.kind === "core"), false);
    assert.equal(floors[0]?.name, "Πιλοτή");
    assert.ok(floors.some((f) => f.name.startsWith("Όροφος")));
  });
  it("two apartments do not overlap and fill the plate", () => {
    const floors = buildProgram(floorMass(), { ...DEFAULT_INPUTS, aptsPerFloor: 2 });
    const floor = floors.find((f) => f.units.length > 0);
    assert.ok(floor);
    assert.equal(floor.units.length, 2);
    assert.equal(unitsOverlap(floor.units[0], floor.units[1]), false);
    const cover = floor.units.reduce((s, u) => s + u.width * u.depth, 0);
    assert.ok(cover >= floor.width * floor.depth * 0.95);
  });
  it("four apartments split into four units", () => {
    const floors = buildProgram(floorMass(), { ...DEFAULT_INPUTS, aptsPerFloor: 4 });
    const floor = floors.find((f) => f.kind === "typical");
    assert.equal(floor?.units.length, 4);
  });
  it("single unit on a house floor", () => {
    const floors = buildProgram(floorMass(), { ...DEFAULT_INPUTS, aptsPerFloor: 1 });
    assert.ok(floors.filter((f) => f.kind === "typical").every((f) => f.units.length === 1));
  });
  it("every residential unit has rooms, walls and a label", () => {
    const units = buildProgram(floorMass(), { ...DEFAULT_INPUTS, aptsPerFloor: 2 }).flatMap((f) => f.units);
    assert.ok(units.length >= 2);
    for (const u of units) {
      assert.ok(u.rooms.length >= 2, u.label);
      assert.ok(u.rooms.every((r) => r.label.length > 0));
      assert.ok(u.area > 10, u.label);
      assert.ok(/^[A-ΩA-ZI]+[0-9]$/u.test(u.label), u.label);
    }
  });
  it("per-floor programs change apartment counts independently", () => {
    const floors = buildProgram(floorMass(), {
      ...DEFAULT_INPUTS,
      aptsPerFloor: 2,
      floorPrograms: { "0": { count: 1, areas: [120] }, "1": { count: 3, areas: [40, 40, 55] } },
    });
    const typical = floors.filter((f) => f.kind === "typical");
    assert.equal(typical[0]?.units.length, 1);
    assert.equal(typical[1]?.units.length, 3);
  });
});

describe("resolveProgram", () => {
  it("falls back to aptsPerFloor and equal areas", () => {
    const p = resolveProgram({ ...DEFAULT_INPUTS, aptsPerFloor: 2, floorPrograms: {} }, 0, 168);
    assert.equal(p.count, 2);
    assert.equal(p.areas.length, 2);
    assert.ok(Math.abs(p.areas[0] - p.areas[1]) < 0.2);
  });
});
