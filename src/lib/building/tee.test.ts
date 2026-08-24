import assert from "node:assert/strict";
import test from "node:test";
import { parseCoverage } from "./tee.ts";

test("coverage 60 means 60%", () => {
  assert.equal(parseCoverage(60), 0.6);
  assert.equal(parseCoverage(0.7), 0.7);
});
