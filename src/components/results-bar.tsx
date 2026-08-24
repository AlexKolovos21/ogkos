import { Badge } from "@/components/ui/badge";
import { formatEl, formatEuro, formatM, formatM2, formatPct } from "@/lib/building/format";
import { cn } from "@/lib/utils";
import { useMassing, useProject } from "@/store/project";

function tone(ratio: number): "ok" | "warn" | "over" {
  if (ratio > 1.01) return "over";
  if (ratio > 0.92) return "warn";
  return "ok";
}

function Stat({
  label,
  value,
  sub,
  ratio,
}: {
  label: string;
  value: string;
  sub?: string;
  ratio?: number;
}) {
  const t = ratio === undefined ? undefined : tone(ratio);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-xs tracking-wide text-muted-foreground">{label}</p>
        {t ? <Badge variant={t}>{formatPct(Math.min(ratio ?? 0, 1.5))}</Badge> : null}
      </div>
      <p className="mt-0.5 font-display text-lg font-medium leading-tight tracking-tight tabular-nums sm:text-xl">
        {value}
      </p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function ResultsBar() {
  const m = useMassing();
  const inputs = useProject((s) => s.inputs);

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-2 lg:grid-cols-6 sm:gap-x-5">
      <Stat
        label="Δόμηση"
        value={formatM2(m.usedFloorArea)}
        sub={`από ${formatM2(m.allowedFloorArea)}`}
        ratio={m.farRatio}
      />
      <Stat
        label="Κάλυψη"
        value={formatM2(m.usedCoverage)}
        sub={`από ${formatM2(m.allowedCoverage)}`}
        ratio={m.coverageRatio}
      />
      <Stat
        label="Ύψος"
        value={formatM(m.totalHeight)}
        sub={`όριο ${formatM(inputs.maxHeight)}`}
        ratio={m.heightRatio}
      />
      <Stat
        label="Όροφοι"
        value={formatEl(m.habitableFloors, 0)}
        sub={m.hasRecessed ? "συν ρετιρέ" : m.groundKind === "pilotis" ? "συν πιλοτή" : "κατοικία"}
      />
      <Stat
        label="Διαμερίσματα"
        value={formatEl(m.apartments, 0)}
        sub={`~${formatM2(m.avgAptSize)} μέσο`}
      />
      <Stat
        label="Εκτίμηση"
        value={formatEuro(m.estimatedCost)}
        sub={`με ΦΠΑ · ${formatEl(m.parkingSpaces, 0)}/${formatEl(m.parkingCapacity, 0)} θέσεις`}
      />
    </div>
  );
}

export function Warnings() {
  const m = useMassing();
  if (m.warnings.length === 0) return null;
  return (
    <ul className="grid gap-1">
      {m.warnings.map((w) => (
        <li key={w} className={cn("text-xs leading-snug text-warn")}>
          {w}
        </li>
      ))}
    </ul>
  );
}
