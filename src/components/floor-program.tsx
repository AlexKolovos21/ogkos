import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBeds, formatM2, formatRooms } from "@/lib/building/format";
import { maxAptsFor } from "@/lib/building/layout";
import { ROOM_LABELS, type RoomKind } from "@/lib/building/types";
import { cn } from "@/lib/utils";
import { useMassing, useProject } from "@/store/project";

const ADD_ROOMS: RoomKind[] = ["bed", "bath", "storage", "kitchen"];

export function FloorProgramEditor() {
  const inputs = useProject((s) => s.inputs);
  const setInput = useProject((s) => s.setInput);
  const setFloorCount = useProject((s) => s.setFloorCount);
  const setFloorArea = useProject((s) => s.setFloorArea);
  const equalizeFloor = useProject((s) => s.equalizeFloor);
  const setUnitBedrooms = useProject((s) => s.setUnitBedrooms);
  const addUnitRoom = useProject((s) => s.addUnitRoom);
  const removeUnitRoom = useProject((s) => s.removeUnitRoom);
  const selectedUnitId = useProject((s) => s.selectedUnitId);
  const setSelectedFloor = useProject((s) => s.setSelectedFloor);
  const setSelectedUnitId = useProject((s) => s.setSelectedUnitId);
  const result = useMassing();
  const living = result.floors.filter((f) => f.kind === "typical" || f.kind === "recessed");
  const globalOn = Object.keys(inputs.floorPrograms).length === 0;

  return (
    <div className="grid gap-4">
      <div className="rounded-xl bg-muted p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Σε όλους τους ορόφους</p>
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((n) => (
            <Button key={n} type="button" size="sm" variant={globalOn && inputs.aptsPerFloor === n ? "default" : "ghost"} onClick={() => setInput("aptsPerFloor", n)}>
              {n}
            </Button>
          ))}
        </div>
      </div>
      {living.map((floor) => {
        const plate = floor.width * floor.depth;
        const max = maxAptsFor(plate);
        const n = floor.units.length;
        const used = floor.units.reduce((s, u) => s + u.area, 0);
        const extras = inputs.floorPrograms[String(floor.habIndex)]?.extras;
        return (
          <section key={floor.index} className="rounded-xl bg-muted/70 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <button type="button" className="font-display text-base font-medium tracking-tight" onClick={() => setSelectedFloor(floor.index)}>
                {floor.name}
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">{formatM2(used)} / {formatM2(floor.netArea)}</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((c) => (
                <Button key={c} type="button" size="sm" variant={n === c ? "default" : "ghost"} disabled={c > max} onClick={() => { setFloorCount(floor.habIndex, c, plate); setSelectedFloor(floor.index); }}>
                  {c}
                </Button>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <Button type="button" size="sm" variant="ghost" onClick={() => equalizeFloor(floor.habIndex, plate)}>Ίσα τ.μ.</Button>
            </div>
            <div className="mt-1 grid gap-1.5">
              {floor.units.map((u, i) => (
                <div key={u.id} className={cn("rounded-lg px-2.5 py-2", selectedUnitId === u.id ? "bg-accent" : "bg-card/70")}>
                  <div className="flex items-center gap-2">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => { setSelectedFloor(u.floorIndex); setSelectedUnitId(u.id); }}>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: u.color }} />
                      <span className="text-sm font-medium">{u.label}</span>
                      <span className="text-xs text-muted-foreground">{formatBeds(u.bedrooms)}</span>
                    </button>
                    <Input type="number" inputMode="decimal" aria-label={`Τετραγωνικά ${u.label}`} className="h-8 w-16 text-right" min={28} max={Math.round(floor.netArea)} step={1} value={Math.round(u.targetArea)} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) setFloorArea(floor.habIndex, i, v, plate); }} />
                    <span className="text-xs text-muted-foreground">μ²</span>
                  </div>
                  <p className="mt-1 pl-5 text-xs leading-snug text-muted-foreground">{formatM2(u.area)} · {formatRooms(u.rooms.map((r) => r.kind))}</p>
                  {selectedUnitId === u.id ? (
                    <div className="mt-2 grid gap-2 border-t border-border/60 pt-2">
                      <p className="text-xs font-medium text-muted-foreground">Υπνοδωμάτια</p>
                      <div className="grid grid-cols-5 gap-1">
                        {[0, 1, 2, 3, 4].map((b) => (
                          <Button key={b} type="button" size="sm" variant={u.bedrooms === b ? "default" : "ghost"} onClick={() => setUnitBedrooms(floor.habIndex, i, b, plate)}>
                            {b === 0 ? "St" : `${b}Υ`}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">Πρόσθετο δωμάτιο</p>
                      <div className="flex flex-wrap gap-1">
                        {ADD_ROOMS.map((k) => (
                          <Button key={k} type="button" size="sm" variant="ghost" onClick={() => addUnitRoom(floor.habIndex, i, k, plate)}>+ {ROOM_LABELS[k]}</Button>
                        ))}
                      </div>
                      {(extras?.[i] ?? []).map((e, ei) => (
                        <div key={`${e.kind}-${ei}`} className="flex items-center justify-between gap-2 text-xs">
                          <span>{ROOM_LABELS[e.kind]} {e.width}×{e.depth} μ.</span>
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeUnitRoom(floor.habIndex, i, ei, plate)}>Αφαίρεση</Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
