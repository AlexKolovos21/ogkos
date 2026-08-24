import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_INPUTS } from "./presets.ts";
import { estimateCost } from "./cost.ts";

test("cost includes VAT and basement", () => {
  const c = estimateCost(
    { ...DEFAULT_INPUTS, basement: true, garageDoor: true, pilotis: true, costPerM2: 1650 },
    { usedFloorArea: 400, footprint: 150, habitableFloors: 3, hasRecessed: false, apartments: 6 },
  );
  assert.ok(c.lines.some((l) => l.id === "living"));
  assert.ok(c.lines.some((l) => l.id === "basement"));
  assert.ok(c.lines.some((l) => l.id === "ramp"));
  assert.ok(c.lines.some((l) => l.id === "door"));
  assert.equal(c.vat, Math.round((c.construction + c.fees) * 0.24));
  assert.equal(c.total, c.construction + c.fees + c.vat);
  assert.ok(c.total > c.construction);
});

test("no garage extras without door", () => {
  const c = estimateCost(
    { ...DEFAULT_INPUTS, basement: true, garageDoor: false, pilotis: false },
    { usedFloorArea: 200, footprint: 100, habitableFloors: 2, hasRecessed: false, apartments: 4 },
  );
  assert.equal(c.lines.some((l) => l.id === "door"), false);
  assert.equal(c.lines.some((l) => l.id === "ramp"), false);
});
