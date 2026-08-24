import { Button } from "@/components/ui/button";
import { SitePlan } from "@/components/site-plan";
import type { ViewMode } from "@/lib/building/types";
import { cn } from "@/lib/utils";
import { useMassing, useProject } from "@/store/project";
import { Box, Compass, Layers, RotateCw, Square } from "lucide-react";

const VIEWS: { id: ViewMode; label: string; icon: typeof Box }[] = [
  { id: "iso", label: "Προοπτική", icon: Box },
  { id: "front", label: "Όψη", icon: Square },
  { id: "side", label: "Πλάγια", icon: Compass },
  { id: "top", label: "Κάτοψη", icon: Layers },
];

export function ViewportToolbar() {
  const view = useProject((s) => s.view);
  const setView = useProject((s) => s.setView);
  const autoRotate = useProject((s) => s.autoRotate);
  const setAutoRotate = useProject((s) => s.setAutoRotate);
  const explode = useProject((s) => s.explode);
  const setExplode = useProject((s) => s.setExplode);
  const selectedFloor = useProject((s) => s.selectedFloor);
  const setSelectedFloor = useProject((s) => s.setSelectedFloor);
  const floors = useMassing().floors;
  const neighborN = useProject((s) => s.lookup?.neighbors.length ?? 0);

  return (
    <>
      <div className="pointer-events-none absolute top-3 right-3 left-3 z-10 flex items-start justify-end gap-2 lg:left-auto">
        {selectedFloor !== null ? (
          <div className="pointer-events-auto mr-auto hidden rounded-xl bg-card/90 px-3 py-2 shadow-[var(--shadow-border)] backdrop-blur-sm lg:block">
            <SitePlan />
          </div>
        ) : null}
        {selectedFloor !== null && selectedFloor < 0 ? (
          <div className="pointer-events-none rounded-xl bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-[var(--shadow-border)] backdrop-blur-sm">
            {selectedFloor === -2
              ? "Υπόγειο 2 — και οι δύο στάθμες, χωρίς τοίχους"
              : "Υπόγειο — χωρίς τοίχους, δες μέσα"}
          </div>
        ) : neighborN > 0 ? (
          <div className="pointer-events-none rounded-xl bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-[var(--shadow-border)] backdrop-blur-sm">
            {neighborN} γειτονικά OSM
          </div>
        ) : null}
        <div className="pointer-events-auto flex gap-0.5 rounded-xl bg-card/90 p-1 shadow-[var(--shadow-border)] backdrop-blur-sm">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const active = view === v.id;
            return (
              <Button
                key={v.id}
                type="button"
                size="icon-sm"
                variant={active ? "default" : "ghost"}
                aria-label={v.label}
                title={v.label}
                onClick={() => setView(v.id)}
                className={cn(!active && "text-muted-foreground")}
              >
                <Icon />
              </Button>
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 left-3 z-10 flex items-end gap-2">
        <div className="toolbar-scroll pointer-events-auto flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl bg-card/90 p-1 shadow-[var(--shadow-border)] backdrop-blur-sm">
          <Button
            type="button"
            size="sm"
            variant={selectedFloor === null && !explode ? "default" : "ghost"}
            onClick={() => {
              setSelectedFloor(null);
              setExplode(false);
            }}
          >
            Κτίριο
          </Button>
          {floors.map((f) => (
            <Button
              key={f.index}
              type="button"
              size="sm"
              variant={selectedFloor === f.index ? "default" : "ghost"}
              onClick={() => setSelectedFloor(f.index)}
              className={cn("shrink-0", selectedFloor !== f.index && "text-muted-foreground")}
            >
              {f.name.replace("Όροφος ", "")}
            </Button>
          ))}
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-0.5 rounded-xl bg-card/90 p-1 shadow-[var(--shadow-border)] backdrop-blur-sm">
          <Button type="button" size="icon-sm" variant={autoRotate ? "default" : "ghost"} aria-label="Περιστροφή" title="Περιστροφή" onClick={() => setAutoRotate(!autoRotate)}>
            <RotateCw />
          </Button>
          <Button type="button" size="icon-sm" variant={explode ? "default" : "ghost"} aria-label="Όροφοι" title="Όροφοι" onClick={() => setExplode(!explode)}>
            <Layers />
          </Button>
        </div>
      </div>
    </>
  );
}
