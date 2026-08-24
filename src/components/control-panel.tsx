import { AddressSearch } from "@/components/address-search";
import { NumberSlider, Segmented, ToggleRow } from "@/components/field";
import { FloorProgramEditor } from "@/components/floor-program";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro, formatSavedAt } from "@/lib/building/format";
import { PRESETS } from "@/lib/building/presets";
import { FACADE_COLORS, type FacadeId } from "@/lib/building/types";
import { cn } from "@/lib/utils";
import { useMassing, useProject } from "@/store/project";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

const TABS = [
  { id: "plot", label: "Οικόπεδο" },
  { id: "building", label: "Κτίριο" },
  { id: "units", label: "Διαμερίσματα" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ControlPanel() {
  const [tab, setTab] = useState<TabId>("plot");
  const inputs = useProject((s) => s.inputs);
  const setInput = useProject((s) => s.setInput);
  const applyPreset = useProject((s) => s.applyPreset);
  const studies = useProject((s) => s.studies);
  const activeId = useProject((s) => s.activeId);
  const loadStudy = useProject((s) => s.loadStudy);
  const deleteStudy = useProject((s) => s.deleteStudy);
  const newStudy = useProject((s) => s.newStudy);
  const massing = useMassing();
  const cost = massing.cost;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav className="grid grid-cols-3 gap-1 border-b border-border px-3 py-2" aria-label="Ενότητες">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("h-10 rounded-md text-xs font-medium transition-colors duration-150", tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        {tab === "plot" ? (
          <div className="grid gap-6">
            <section className="grid gap-3">
              <h2 className="font-display text-lg font-medium tracking-tight">Διεύθυνση</h2>
              <AddressSearch />
            </section>
            <section className="grid gap-3">
              <h2 className="font-display text-lg font-medium tracking-tight">Πρότυπο</h2>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" title={p.blurb} onClick={() => applyPreset(p.inputs, p.name)} className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors duration-150 hover:bg-accent">{p.name}</button>
                ))}
              </div>
            </section>
            <section className="grid gap-4">
              <h2 className="font-display text-lg font-medium tracking-tight">Διαστάσεις</h2>
              <NumberSlider label="Πλάτος πρόσοψης" value={inputs.plotWidth} min={6} max={60} step={0.5} unit="μ." onChange={(n) => setInput("plotWidth", n)} />
              <NumberSlider label="Βάθος" value={inputs.plotDepth} min={8} max={80} step={0.5} unit="μ." onChange={(n) => setInput("plotDepth", n)} />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Σύστημα</p>
                <Segmented value={inputs.system} onChange={(v) => { setInput("system", v); if (v === "continuous") { setInput("sideSetback", 0); setInput("frontSetback", 0); } else if (inputs.sideSetback < 2.5) { setInput("sideSetback", 2.5); if (inputs.frontSetback < 1) setInput("frontSetback", 4); } }} options={[{ value: "continuous", label: "Συνεχές" }, { value: "detached", label: "Πανταχόθεν" }]} />
              </div>
            </section>
            <section className="grid gap-4">
              <h2 className="font-display text-lg font-medium tracking-tight">Συντελεστές</h2>
              <NumberSlider label="Σ.Δ. δόμηση" value={inputs.far} min={0.1} max={4.2} step={0.05} onChange={(n) => setInput("far", n)} hint="Επιτρεπόμενα τετραγωνικά = εμβαδόν × Σ.Δ." />
              <NumberSlider label="Σ.Κ. κάλυψη" value={inputs.coverage} min={0.1} max={0.8} step={0.05} onChange={(n) => setInput("coverage", n)} />
              <NumberSlider label="Μέγιστο ύψος" value={inputs.maxHeight} min={4} max={32} step={0.5} unit="μ." onChange={(n) => setInput("maxHeight", n)} />
              {inputs.system === "detached" ? (
                <>
                  <NumberSlider label="Προκήπιο" value={inputs.frontSetback} min={0} max={15} step={0.5} unit="μ." onChange={(n) => setInput("frontSetback", n)} />
                  <NumberSlider label="Πλάγιες" value={inputs.sideSetback} min={0} max={12} step={0.5} unit="μ." onChange={(n) => setInput("sideSetback", n)} />
                  <NumberSlider label="Πίσω" value={inputs.rearSetback} min={0} max={15} step={0.5} unit="μ." onChange={(n) => setInput("rearSetback", n)} />
                </>
              ) : (
                <NumberSlider label="Πίσω απόσταση" value={inputs.rearSetback} min={0} max={15} step={0.5} unit="μ." onChange={(n) => setInput("rearSetback", n)} />
              )}
            </section>
            <section className="grid gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-medium tracking-tight">Μελέτες</h2>
                <Button type="button" size="sm" variant="secondary" onClick={newStudy}><Plus />Νέα</Button>
              </div>
              {studies.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted-foreground">Αποθήκευση πάνω δεξιά — μένουν σε αυτή τη συσκευή.</p>
              ) : (
                <div className="grid gap-1.5">
                  {studies.map((st) => (
                    <div key={st.id} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-2", st.id === activeId ? "bg-accent" : "bg-muted/60")}>
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => loadStudy(st.id)}>
                        <p className="truncate text-sm font-medium">{st.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSavedAt(st.savedAt)} · {st.inputs.plotWidth}×{st.inputs.plotDepth} μ.</p>
                      </button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Διαγραφή" onClick={() => deleteStudy(st.id)}><Trash2 /></Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
        {tab === "building" ? (
          <div className="grid gap-6">
            <section className="grid gap-4">
              <h2 className="font-display text-lg font-medium tracking-tight">Όγκος</h2>
              <ToggleRow label="Πιλοτή" description="Ανοιχτό ισόγειο στάθμευσης — μετρά στο ύψος, όχι στη δόμηση." checked={inputs.pilotis} onCheckedChange={(v) => setInput("pilotis", v)} />
              <ToggleRow label="Υπόγειο" description="Στάθμευση κάτω από το έδαφος, με ράμπα." checked={inputs.basement} onCheckedChange={(v) => setInput("basement", v)} />
              {inputs.basement ? (
                <>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Στάθμες υπογείου</p>
                    <Segmented value={inputs.basementLevels >= 2 ? "2" : "1"} onChange={(v) => setInput("basementLevels", Number(v))} options={[{ value: "1", label: "1 όροφος" }, { value: "2", label: "2 όροφοι" }]} />
                  </div>
                  <ToggleRow label="Ημιυπόγειο" description="Φαίνεται λίγο πάνω από το έδαφος." checked={inputs.semiBasement} onCheckedChange={(v) => setInput("semiBasement", v)} />
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Ράμπα</p>
                    <Segmented value={inputs.rampSide ?? "left"} onChange={(v) => setInput("rampSide", v)} options={[{ value: "left", label: "Αριστερά" }, { value: "right", label: "Δεξιά" }]} />
                  </div>
                  <NumberSlider label="Ύψος στάθμης υπογείου" value={inputs.basementHeight || 2.8} min={2.4} max={3.4} step={0.1} unit="μ." onChange={(n) => setInput("basementHeight", n)} />
                  <ToggleRow label="Αποθήκες" description="Μικρές αποθηκούλες στο βάθος κάθε στάθμης." checked={inputs.basementStorage} onCheckedChange={(v) => setInput("basementStorage", v)} />
                </>
              ) : null}
              <ToggleRow label="Γκαραζόπορτα" description="Πόρτα στο πεζοδρόμιο και ράμπα με κλίση ≈ 15% προς το υπόγειο." checked={inputs.garageDoor && (inputs.basement || inputs.pilotis)} onCheckedChange={(v) => { setInput("garageDoor", v); if (v && !inputs.basement && !inputs.pilotis) setInput("basement", true); }} />
              {inputs.basement ? (
                <NumberSlider label="Θέσεις αυτοκινήτων" value={inputs.parkingTarget > 0 ? Math.min(inputs.parkingTarget, Math.max(1, massing.parkingCapacity)) : massing.parkingCapacity} min={0} max={Math.max(1, massing.parkingCapacity)} step={1} unit="θ." onChange={(n) => setInput("parkingTarget", n)} hint={`Χωράνε ${massing.parkingCapacity} στο περίγραμμα. Κλίση ράμπας ${Math.round(massing.rampGrade * 100)}%.`} />
              ) : null}
              <NumberSlider label="Ύψος ορόφου" value={inputs.floorHeight} min={2.7} max={3.6} step={0.05} unit="μ." onChange={(n) => setInput("floorHeight", n)} />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Προτεραιότητα</p>
                <Segmented value={inputs.massing} onChange={(v) => setInput("massing", v)} options={[{ value: "coverage", label: "Κάλυψη" }, { value: "height", label: "Ύψος" }]} />
              </div>
            </section>
            <section className="grid gap-4">
              <h2 className="font-display text-lg font-medium tracking-tight">Όψη</h2>
              <NumberSlider label="Βάθος εξωστών" value={inputs.balconyDepth} min={0} max={2.4} step={0.1} unit="μ." onChange={(n) => setInput("balconyDepth", n)} />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Στέγη</p>
                <Segmented value={inputs.roofType} onChange={(v) => setInput("roofType", v)} options={[{ value: "flat", label: "Δώμα" }, { value: "pitched", label: "Στέγη" }]} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Επίχρισμα</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FACADE_COLORS) as FacadeId[]).map((id) => (
                    <button key={id} type="button" aria-label={id} onClick={() => setInput("facade", id)} className={cn("size-9 rounded-full border transition-shadow duration-150", inputs.facade === id ? "border-primary ring-2 ring-ring/50" : "border-border hover:border-foreground/30")} style={{ background: FACADE_COLORS[id] }} />
                  ))}
                </div>
              </div>
              <NumberSlider label="Τιμή κατοικίας" value={inputs.costPerM2} min={1100} max={2800} step={50} unit="€/μ²" onChange={(n) => setInput("costPerM2", n)} hint="«Με το κλειδί», χωρίς ΦΠΑ. Αττική 2026 συνήθως 1.400–2.200." />
              <div className="rounded-xl bg-muted p-3">
                <p className="font-display text-base font-medium tracking-tight">Κόστος</p>
                <ul className="mt-2 grid gap-1.5">
                  {cost.lines.map((l) => (
                    <li key={l.id} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">{l.label}</span>
                      <span className="tabular-nums text-foreground">{formatEuro(l.amount)}</span>
                    </li>
                  ))}
                  <li className="mt-1 flex justify-between gap-3 text-xs"><span className="text-muted-foreground">Αμοιβές μελέτης / επίβλεψη 8%</span><span className="tabular-nums">{formatEuro(cost.fees)}</span></li>
                  <li className="flex justify-between gap-3 text-xs"><span className="text-muted-foreground">ΦΠΑ 24%</span><span className="tabular-nums">{formatEuro(cost.vat)}</span></li>
                  <li className="mt-1 flex justify-between gap-3 text-sm font-medium"><span>Σύνολο</span><span className="tabular-nums">{formatEuro(cost.total)}</span></li>
                </ul>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{cost.note}</p>
              </div>
            </section>
          </div>
        ) : null}
        {tab === "units" ? (
          <div className="grid gap-4">
            <div>
              <h2 className="font-display text-lg font-medium tracking-tight">Διαμερίσματα</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Διάλεξε πόσα μπαίνουν σε κάθε όροφο και τα τ.μ. Πάτα όροφο στο μοντέλο για τα δωμάτια.</p>
            </div>
            <FloorProgramEditor />
          </div>
        ) : null}
        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">Ενδεικτικό μοντέλο με απλοποιημένους κανόνες ΝΟΚ. Δεν αποτελεί άδεια.</p>
        <div className="mt-2"><Badge>ΝΟΚ · εκπαιδευτικό</Badge></div>
      </div>
    </div>
  );
}

export function PanelHeader({ onClose }: { onClose?: () => void }) {
  const name = useProject((s) => s.name);
  const setName = useProject((s) => s.setName);
  const dirty = useProject((s) => s.dirty);
  const saveStudy = useProject((s) => s.saveStudy);
  const [saved, setSaved] = useState(false);
  return (
    <div className="border-b border-border px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl font-medium leading-none tracking-tight">ΟΓΚΟΣ</p>
          <p className="mt-1 text-xs text-muted-foreground">Όγκος · όροφοι · διαμερίσματα</p>
        </div>
        {onClose ? <Button variant="ghost" size="sm" onClick={onClose}>Κλείσιμο</Button> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Όνομα μελέτης" className="h-10" />
        <Button type="button" size="sm" className="h-10" onClick={() => { saveStudy(); setSaved(true); window.setTimeout(() => setSaved(false), 1400); }}>
          <Save />{saved ? "ΟΚ" : dirty ? "Αποθήκευση" : "Αποθηκεύτηκε"}
        </Button>
      </div>
    </div>
  );
}
