import assert from "node:assert/strict";
import test from "node:test";
import type { OsmBuilding } from "./geo.ts";
import { placeNeighbors } from "./neighbors.ts";

function b(partial: Partial<OsmBuilding> & { id: string }): OsmBuilding {
  return {
    width: 10,
    depth: 12,
    area: 120,
    distanceM: 20,
    lat: 38.0,
    lon: 23.73,
    points: [],
    ...partial,
  };
}

test("neighbors keep OSM north/east offset and skip the origin", () => {
  const origin = { lat: 38, lon: 23.73, id: "me" };
  const placed = placeNeighbors(
    origin,
    [
      b({ id: "me", distanceM: 0, lat: 38, lon: 23.73 }),
      b({ id: "n1", distanceM: 40, lat: 38.00036, lon: 23.73 }),
      b({ id: "n2", distanceM: 40, lat: 38, lon: 23.73045 }),
    ],
    12,
    22,
  );
  assert.equal(placed.some((p) => p.id === "me"), false);
  const n1 = placed.find((p) => p.id === "n1");
  const n2 = placed.find((p) => p.id === "n2");
  assert.ok(n1 && n1.z > 20);
  assert.ok(n2 && n2.x > 20);
});
