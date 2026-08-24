import type { ProjectInputs } from "./types.ts";

export type CostLine = {
  id: string;
  label: string;
  amount: number;
  hint?: string;
};

export type CostBreakdown = {
  lines: CostLine[];
  construction: number;
  fees: number;
  vat: number;
  total: number;
  note: string;
};

const FEES = 0.08;
const VAT = 0.24;
const BASEMENT_F = 0.72;
const PILOTIS_F = 0.4;
const BALCONY_EUR = 220;
const ELEVATOR = 34_000;
const RAMP = 26_000;
const DOOR = 4_800;

function euro(n: number) {
  return Math.round(n);
}

export function estimateCost(i: ProjectInputs, d: {
  usedFloorArea: number;
  footprint: number;
  habitableFloors: number;
  hasRecessed: boolean;
  apartments: number;
}): CostBreakdown {
  const rate = i.costPerM2;
  const lines: CostLine[] = [];

  lines.push({
    id: "living",
    label: "Όροφοι κατοικίας / καταστήματα",
    amount: euro(d.usedFloorArea * rate),
    hint: `${Math.round(d.usedFloorArea)} μ² × ${rate} €/μ²`,
  });

  if (i.basement) {
    const levels = i.basementLevels >= 2 ? 2 : 1;
    lines.push({
      id: "basement",
      label: levels === 2 ? "Δύο υπόγεια — εκσκαφή, στεγάνωση, στάθμευση" : "Υπόγειο — εκσκαφή, στεγάνωση, στάθμευση",
      amount: euro(d.footprint * rate * BASEMENT_F * levels),
      hint: levels === 2 ? "× 2 στάθμες" : "≈ 72% της τιμής κατοικίας",
    });
  }

  if (i.pilotis) {
    lines.push({
      id: "pilotis",
      label: "Πιλοτή — φέροντας οργανισμός",
      amount: euro(d.footprint * rate * PILOTIS_F),
      hint: "Στύλοι και πλάκα, χωρίς τοίχους",
    });
  }

  const balconyArea = i.balconyDepth > 0.2
    ? d.habitableFloors * Math.sqrt(d.footprint) * i.balconyDepth * 1.6
    : 0;
  if (balconyArea > 4) {
    lines.push({
      id: "balcony",
      label: "Εξώστες",
      amount: euro(balconyArea * BALCONY_EUR),
      hint: `${Math.round(balconyArea)} μ² × ${BALCONY_EUR} €/μ²`,
    });
  }

  const storeys = d.habitableFloors + (i.pilotis ? 1 : 0) + (d.hasRecessed ? 1 : 0);
  if (storeys >= 3) {
    lines.push({
      id: "lift",
      label: "Ανελκυστήρας",
      amount: ELEVATOR,
      hint: "Ενδεικτικό 6–8 στάσεις, 2026",
    });
  }

  if (i.garageDoor && i.basement) {
    const levels = i.basementLevels >= 2 ? 2 : 1;
    lines.push({
      id: "ramp",
      label: levels === 2 ? "Ράμπες υπογείων" : "Ράμπα υπογείου",
      amount: RAMP * levels,
      hint: "Οπλισμένο σκυρόδεμα, κλίση ≈ 15%",
    });
  }

  if (i.garageDoor && (i.basement || i.pilotis)) {
    lines.push({
      id: "door",
      label: "Γκαραζόπορτα",
      amount: DOOR,
      hint: "Τμηματική, 1–2 θέσεις",
    });
  }

  const construction = lines.reduce((s, l) => s + l.amount, 0);
  const fees = euro(construction * FEES);
  const vat = euro((construction + fees) * VAT);
  const total = construction + fees + vat;

  return {
    lines,
    construction,
    fees,
    vat,
    total,
    note: "Ενδεικτική εκτίμηση Αττική 2026, τιμές εργολάβου. Δεν είναι προσφορά. Η τιμή €/μ² είναι «με το κλειδί», χωρίς ΦΠΑ — την αλλάζεις εσύ.",
  };
}
