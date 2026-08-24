import { estimateCost } from "./cost.ts";
import { buildProgram } from "./layout.ts";
import { garageRamps, MAX_GRADE, packParking, rampGrade } from "./parking.ts";
import type { Mass, MassingResult, ProjectInputs } from "./types.ts";

const PILOTIS_H = 2.8;
const SEMI_EXPOSE = 1.15;
const PARAPET = 0.65;
const PITCHED_H = 2.4;
const CORE_W = 2.6;
const CORE_D = 5.1;
const MIN_SPAN = 5.5;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function computeMassing(i: ProjectInputs): MassingResult {
  const plotArea = i.plotWidth * i.plotDepth;
  const allowedFloorArea = plotArea * i.far;
  const allowedCoverage = plotArea * i.coverage;
  const side = i.system === "continuous" ? 0 : Math.max(0, i.sideSetback);
  const rawFront = Math.max(0, i.frontSetback);
  const rawRear = Math.max(0, i.rearSetback);
  const maxSetbackSum = Math.max(0, i.plotDepth - MIN_SPAN);
  const setbackScale = rawFront + rawRear > maxSetbackSum && rawFront + rawRear > 0 ? maxSetbackSum / (rawFront + rawRear) : 1;
  const front = rawFront * setbackScale;
  const rear = rawRear * setbackScale;
  const buildableWidth = Math.max(MIN_SPAN, i.plotWidth - side * 2);
  const buildableDepth = Math.max(MIN_SPAN, i.plotDepth - front - rear);
  const envelope = buildableWidth * buildableDepth;
  const maxFootprint = Math.max(MIN_SPAN * MIN_SPAN, Math.min(allowedCoverage, envelope));
  const pilotis = i.pilotis;
  const heightBudget = Math.max(i.floorHeight, i.maxHeight - (pilotis ? PILOTIS_H : 0));
  const maxByHeight = Math.max(1, Math.floor((heightBudget + 0.02) / i.floorHeight));

  let footprintArea: number;
  let habitableFloors: number;
  if (i.massing === "height") {
    habitableFloors = maxByHeight;
    footprintArea = Math.min(maxFootprint, allowedFloorArea / habitableFloors);
    while (habitableFloors > 1 && footprintArea * habitableFloors > allowedFloorArea + 0.8) {
      habitableFloors -= 1;
      footprintArea = Math.min(maxFootprint, allowedFloorArea / habitableFloors);
    }
  } else {
    footprintArea = maxFootprint;
    const maxByFar = Math.max(1, Math.floor(allowedFloorArea / footprintArea + 1e-6));
    habitableFloors = Math.min(maxByFar, maxByHeight);
  }

  let footprintWidth = buildableWidth;
  let footprintDepth = footprintArea / footprintWidth;
  if (footprintDepth > buildableDepth) {
    footprintDepth = buildableDepth;
    footprintWidth = Math.min(buildableWidth, footprintArea / footprintDepth);
  }
  if (footprintDepth < MIN_SPAN) {
    footprintDepth = Math.min(buildableDepth, MIN_SPAN);
    footprintWidth = Math.min(buildableWidth, footprintArea / footprintDepth);
  }
  if (footprintWidth < MIN_SPAN) {
    footprintWidth = Math.min(buildableWidth, MIN_SPAN);
    footprintDepth = Math.min(buildableDepth, footprintArea / footprintWidth);
  }
  footprintWidth = round1(Math.max(MIN_SPAN, footprintWidth));
  footprintDepth = round1(Math.max(MIN_SPAN, footprintDepth));
  const actualFootprint = footprintWidth * footprintDepth;
  habitableFloors = Math.min(habitableFloors, Math.max(1, Math.floor(allowedFloorArea / actualFootprint + 1e-6)), maxByHeight);

  let recessedArea = 0;
  let recessedW = 0;
  let recessedD = 0;
  const usedTypical = actualFootprint * habitableFloors;
  const leftoverFar = allowedFloorArea - usedTypical;
  const heightUsedTypical = (pilotis ? PILOTIS_H : 0) + habitableFloors * i.floorHeight;
  const leftoverHeight = i.maxHeight - heightUsedTypical;
  if (leftoverFar >= actualFootprint * 0.28 && leftoverHeight >= i.floorHeight * 0.92) {
    recessedArea = Math.min(leftoverFar, actualFootprint * 0.72);
    recessedW = round1(footprintWidth * 0.78);
    recessedD = recessedArea / recessedW;
    if (recessedD > footprintDepth * 0.88) {
      recessedD = footprintDepth * 0.82;
      recessedW = recessedArea / recessedD;
    }
    recessedW = round1(Math.max(5, recessedW));
    recessedD = round1(Math.max(5, recessedD));
    recessedArea = recessedW * recessedD;
    if (usedTypical + recessedArea > allowedFloorArea + 1) recessedArea = 0;
  }

  const frontZ = -i.plotDepth / 2 + front;
  const buildingZ = frontZ + footprintDepth / 2;
  const buildingX = 0;
  const masses: Mass[] = [];
  let y = 0;

  if (i.basement) {
    const expose = i.semiBasement ? SEMI_EXPOSE : 0;
    const bh = i.basementHeight >= 2.4 ? i.basementHeight : 2.8;
    const levels = i.basementLevels >= 2 ? 2 : 1;
    const bw = Math.max(5, footprintWidth - 0.5);
    const bd = Math.max(5, footprintDepth - 0.5);
    for (let k = 0; k < levels; k++) {
      masses.push({
        id: k === 0 ? "basement" : "basement-2",
        kind: "basement",
        width: bw, depth: bd, height: bh,
        x: buildingX, y: expose - bh * (k + 1), z: buildingZ, floorIndex: -(k + 1),
      });
    }
  }

  const groundIsCommercial = !pilotis && i.system === "continuous";
  if (pilotis) {
    masses.push({
      id: "pilotis", kind: "pilotis", width: footprintWidth, depth: footprintDepth, height: PILOTIS_H,
      x: buildingX, y: 0, z: buildingZ, floorIndex: 0,
    });
    y = PILOTIS_H;
  }

  for (let f = 0; f < habitableFloors; f++) {
    const isGround = !pilotis && f === 0;
    masses.push({
      id: `floor-${f}`,
      kind: isGround && groundIsCommercial ? "commercial" : "typical",
      width: footprintWidth, depth: footprintDepth, height: i.floorHeight,
      x: buildingX, y, z: buildingZ, floorIndex: pilotis ? f + 1 : f,
    });
    y += i.floorHeight;
  }

  if (recessedArea > 0) {
    const setback = (footprintDepth - recessedD) * 0.45;
    masses.push({
      id: "recessed", kind: "recessed", width: recessedW, depth: recessedD, height: i.floorHeight,
      x: buildingX, y, z: frontZ + setback + recessedD / 2,
      floorIndex: pilotis ? habitableFloors + 1 : habitableFloors,
    });
    y += i.floorHeight;
  }

  const coreW = clamp(CORE_W, 2.2, footprintWidth * 0.38);
  const coreD = clamp(CORE_D, 3.6, footprintDepth * 0.48);
  masses.push({
    id: "core", kind: "core", width: coreW, depth: coreD, height: y + 2.25,
    x: buildingX, y: 0, z: buildingZ + footprintDepth / 2 - coreD / 2 - 0.25, floorIndex: 99,
  });

  const floors = buildProgram(masses, i);
  const units = floors.flatMap((f) => f.units);
  const usedFloorArea = actualFootprint * habitableFloors + recessedArea;
  const usedCoverage = actualFootprint;
  const roofExtra = i.roofType === "pitched" ? PITCHED_H * 0.42 : PARAPET;
  const totalHeight = y + roofExtra;
  const apartments = units.filter((u) => !u.label.startsWith("Κ")).length;
  const livingArea = units.filter((u) => !u.label.startsWith("Κ")).reduce((s, u) => s + u.area, 0);
  const avgAptSize = apartments > 0 ? livingArea / apartments : 0;
  const basementMasses = masses.filter((m) => m.kind === "basement");
  let parkingCapacity = 0;
  for (const bm of basementMasses) parkingCapacity += packParking(bm.width, bm.depth, i.garageDoor, i.rampSide, i.basementStorage).capacity;
  if (pilotis) parkingCapacity += packParking(footprintWidth, footprintDepth, false).capacity;
  const parkingSpaces = i.parkingTarget > 0 ? Math.min(i.parkingTarget, parkingCapacity) : parkingCapacity;
  let grade = 0;
  if (i.garageDoor && basementMasses[0]) {
    const segs = garageRamps({
      cx: basementMasses[0].x, cz: basementMasses[0].z, width: basementMasses[0].width, depth: basementMasses[0].depth,
      yStreet: 0, yUpper: basementMasses[0].y, yLower: basementMasses[1]?.y, side: i.rampSide,
    });
    grade = Math.max(0, ...segs.map((s) => rampGrade(s.y0 - s.y1, Math.abs(s.z1 - s.z0))));
  }
  const greenArea = Math.max(0, plotArea - usedCoverage);
  const warnings: string[] = [];
  if (usedFloorArea > allowedFloorArea + 1) warnings.push("Η δόμηση υπερβαίνει τον επιτρεπόμενο συντελεστή.");
  if (usedCoverage > allowedCoverage + 1) warnings.push("Η κάλυψη υπερβαίνει τον επιτρεπόμενο συντελεστή.");
  if (totalHeight > i.maxHeight + 0.35) warnings.push("Το ύψος υπερβαίνει το μέγιστο του οικοπέδου.");
  if (buildableWidth < 6.5) warnings.push("Το οικοδομήσιμο πλάτος είναι στενό — μειώστε τις πλάγιες αποστάσεις.");
  if (i.system === "detached" && side < 2.5 && i.maxHeight > 8) warnings.push("Στο πανταχόθεν ελεύθερο η πλάγια απόσταση είναι συνήθως ≥ 2,50 μ. (ή Δ/2).");
  if (avgAptSize < 45 && apartments > 0) warnings.push("Τα διαμερίσματα βγαίνουν πολύ μικρά — μειώστε τον αριθμό ανά όροφο.");
  if (i.basement && parkingSpaces < apartments) warnings.push(`Θέσεις στάθμευσης ${parkingSpaces} — λιγότερες από τα ${apartments} διαμερίσματα.`);
  if (grade > MAX_GRADE + 0.01) warnings.push("Η κλίση της ράμπας βγαίνει απότομη για αυτό το βάθος οικοπέδου.");

  const cost = estimateCost(i, { usedFloorArea, footprint: actualFootprint, habitableFloors, hasRecessed: recessedArea > 0, apartments });
  return {
    plotArea, allowedFloorArea, allowedCoverage, usedFloorArea, usedCoverage,
    unusedFar: Math.max(0, allowedFloorArea - usedFloorArea),
    unusedHeight: Math.max(0, i.maxHeight - totalHeight),
    footprintWidth, footprintDepth, buildingX, buildingZ, habitableFloors, totalHeight,
    apartments, avgAptSize, parkingSpaces, parkingCapacity, rampGrade: grade, greenArea,
    buildableWidth, buildableDepth, masses, floors, units,
    farRatio: allowedFloorArea > 0 ? usedFloorArea / allowedFloorArea : 0,
    coverageRatio: allowedCoverage > 0 ? usedCoverage / allowedCoverage : 0,
    heightRatio: i.maxHeight > 0 ? totalHeight / i.maxHeight : 0,
    estimatedCost: cost.total, cost, warnings, hasRecessed: recessedArea > 0,
    groundKind: pilotis ? "pilotis" : groundIsCommercial ? "commercial" : "typical",
  };
}

export { PILOTIS_H, PITCHED_H, PARAPET };
