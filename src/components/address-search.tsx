import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEl, formatM, formatM2 } from "@/lib/building/format";
import { osmTile } from "@/lib/building/geo";
import { lookupAddress, lookAround, suggestAddress } from "@/lib/building/lookup-address";
import type { AddressPlace } from "@/lib/building/lookup";
import { useProject } from "@/store/project";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function MiniMap({ lat, lon }: { lat: number; lon: number }) {
  const z = 17;
  const t = osmTile(lat, lon, z);
  return (
    <div className="relative overflow-hidden rounded-xl bg-muted">
      <img src={`https://tile.openstreetmap.org/${z}/${t.x}/${t.y}.png`} alt="" width={256} height={256} className="block h-40 w-full object-cover" />
      <span className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-primary-foreground" />
      <p className="absolute right-2 bottom-1 text-[10px] text-primary-foreground/90">© OSM</p>
    </div>
  );
}

const EMPTY = {
  query: "", place: null, building: null, houseMatch: false, candidates: [], neighbors: [], streets: [], heading: 0,
  suggestions: [] as AddressPlace[], context: null, officialTerms: null, officialNote: "",
  osmUrl: "https://www.openstreetmap.org/", mapsUrl: "https://www.google.com/maps",
  teeUrl: "https://sdigmap.tee.gov.gr/sdmquery/public/", streetViewUrl: "https://www.google.com/maps",
};

export function AddressSearch() {
  const query = useProject((s) => s.addressQuery);
  const setQuery = useProject((s) => s.setAddressQuery);
  const lookup = useProject((s) => s.lookup);
  const setLookup = useProject((s) => s.setLookup);
  const ingestAddress = useProject((s) => s.ingestAddress);
  const applyOsmBuilding = useProject((s) => s.applyOsmBuilding);
  const [busy, setBusy] = useState(false);
  const [hints, setHints] = useState<AddressPlace[]>([]);
  const [hintBusy, setHintBusy] = useState(false);
  const gen = useRef(0);
  const hintGen = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 4 || busy) return;
    if (lookup?.place && lookup.place.label === q) return;
    const id = ++hintGen.current;
    setHintBusy(true);
    const t = window.setTimeout(() => {
      void suggestAddress({ data: { query: q } })
        .then((r) => { if (id !== hintGen.current) return; setHints(r.places); })
        .catch(() => { if (id !== hintGen.current) return; setHints([]); })
        .finally(() => { if (id === hintGen.current) setHintBusy(false); });
    }, 550);
    return () => window.clearTimeout(t);
  }, [query, busy, lookup]);

  function fillAround(id: number, result: { place: AddressPlace | null }) {
    const lat = result.place?.lat; const lon = result.place?.lon;
    if (lat === undefined || lon === undefined) return;
    void lookAround({ data: { lat, lon } }).then((ctx) => {
      if (id !== gen.current) return;
      const cur = useProject.getState().lookup;
      if (!cur?.place) return;
      useProject.getState().setLookup({
        ...cur, context: ctx, streetViewUrl: ctx.streetViewUrl || cur.streetViewUrl,
        place: { ...cur.place, city: cur.place.city ?? ctx.city, suburb: cur.place.suburb ?? ctx.suburb, postcode: cur.place.postcode ?? ctx.postcode },
      });
    }).catch(() => undefined);
  }

  async function applyPlace(p: AddressPlace) {
    const id = ++gen.current;
    hintGen.current += 1;
    setHints([]); setBusy(true); setQuery(p.label);
    try {
      const result = await lookupAddress({ data: { query: p.label, lat: p.lat, lon: p.lon, street: p.street, housenumber: p.housenumber, city: p.city, suburb: p.suburb } });
      if (id !== gen.current) return;
      ingestAddress(result);
      fillAround(id, result);
    } catch {
      if (id !== gen.current) return;
      setLookup({ ...EMPTY, query: p.label, error: "Η αναζήτηση απέτυχε. Δοκίμασε ξανά." });
    } finally {
      if (id === gen.current) setBusy(false);
    }
  }

  async function search() {
    const q = query.trim();
    if (q.length < 3) return;
    if (hints.length === 1 && hints[0]) { await applyPlace(hints[0]); return; }
    if (hints.length > 1) return;
    const id = ++gen.current;
    hintGen.current += 1;
    setBusy(true);
    try {
      const result = await lookupAddress({ data: { query: q } });
      if (id !== gen.current) return;
      const list = result.place ? [result.place, ...result.suggestions] : result.suggestions;
      if (list.length > 1) { setHints(list); return; }
      ingestAddress(result);
      fillAround(id, result);
    } catch {
      if (id !== gen.current) return;
      setLookup({ ...EMPTY, query: q, error: "Η αναζήτηση απέτυχε. Δοκίμασε ξανά." });
    } finally {
      if (id === gen.current) setBusy(false);
    }
  }

  function clear() {
    gen.current += 1; hintGen.current += 1; setBusy(false); setHints([]); setQuery(""); setLookup(null);
  }

  const neighborCount = lookup?.neighbors.length ?? 0;
  const used = lookup?.building;
  const alt = lookup?.suggestions ?? [];

  return (
    <div className="grid gap-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="γαμωτοσπιτισου" aria-label="Διεύθυνση" className="h-10" autoComplete="off" />
        {query || lookup ? <Button type="button" size="sm" variant="ghost" className="h-10 px-2" onClick={clear} aria-label="Καθαρισμός"><X /></Button> : null}
        <Button type="submit" size="sm" className="h-10" disabled={busy || query.trim().length < 3}><Search />{busy ? "…" : "Εύρεση"}</Button>
      </form>
      {hintBusy && !busy ? <p className="text-xs text-muted-foreground">Ψάχνω διευθύνσεις…</p> : null}
      {hints.length > 0 && !busy ? (
        <div className="grid gap-1">
          <p className="text-xs text-muted-foreground">Διάλεξε τη σωστή:</p>
          {hints.map((p) => (
            <button key={`${p.lat}-${p.lon}-${p.label}`} type="button" className="rounded-lg bg-muted px-3 py-2 text-left text-xs hover:bg-accent" onClick={() => void applyPlace(p)}>
              <span className="font-medium">{p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ""}` : p.label}</span>
              <span className="mt-0.5 block text-muted-foreground">{[p.suburb, p.city, p.postcode ? `Τ.Κ. ${p.postcode}` : null].filter(Boolean).join(" · ") || p.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      {busy ? <p className="text-xs text-muted-foreground">Φορτώνω όρους ΤΕΕ και τετράγωνο OSM…</p> : null}
      {lookup?.error ? <p className="text-xs leading-relaxed text-warn">{lookup.error}</p> : null}
      {lookup?.place ? (
        <div className="grid gap-2">
          <MiniMap lat={lookup.place.lat} lon={lookup.place.lon} />
          <p className="text-sm font-medium">{lookup.place.label}</p>
          {lookup.context?.reverseLabel && lookup.context.reverseLabel !== lookup.place.label ? <p className="text-xs leading-relaxed text-muted-foreground">{lookup.context.reverseLabel}</p> : null}
          <p className="text-xs text-muted-foreground">{lookup.place.postcode ? `Τ.Κ. ${lookup.place.postcode} · ` : ""}{lookup.place.suburb ? `${lookup.place.suburb} · ` : ""}{lookup.place.city ?? "OpenStreetMap"}</p>
          {alt.length > 0 ? (
            <div className="grid gap-1">
              <p className="text-xs text-muted-foreground">Άλλη διεύθυνση:</p>
              {alt.slice(0, 4).map((p) => (
                <button key={`alt-${p.lat}-${p.lon}`} type="button" className="rounded-lg bg-muted px-3 py-2 text-left text-xs hover:bg-accent" onClick={() => void applyPlace(p)}>{p.label}</button>
              ))}
            </div>
          ) : null}
          {lookup.officialTerms ? (
            <div className="rounded-xl bg-muted px-3 py-2.5">
              <p className="text-sm font-medium">Όροι ΤΕΕ</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {lookup.officialTerms.far !== undefined ? `Σ.Δ. ${formatEl(lookup.officialTerms.far, 2)}` : null}
                {lookup.officialTerms.coverage !== undefined ? ` · Σ.Κ. ${formatEl(lookup.officialTerms.coverage * 100, 0)}%` : null}
                {lookup.officialTerms.maxHeight !== undefined ? ` · ύψος ${formatM(lookup.officialTerms.maxHeight)}` : null}
                {lookup.officialTerms.floors !== undefined ? ` · ${lookup.officialTerms.floors} όροφοι` : null}
                {lookup.officialTerms.system === "continuous" ? " · συνεχές" : lookup.officialTerms.system === "detached" ? " · πανταχόθεν" : null}
              </p>
              {lookup.officialTerms.fek ? <p className="mt-1 text-xs text-muted-foreground">ΦΕΚ {lookup.officialTerms.fek}</p> : null}
            </div>
          ) : null}
          {used ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Περίγραμμα OSM {formatM(used.width)} × {formatM(used.depth)}{used.area ? ` · ${formatM2(used.area)}` : ""}{used.height ? ` · ύψος OSM ${formatM(used.height)}` : used.levels ? ` · ${used.levels} όροφοι OSM` : " · ύψος γειτόνων μόνο όπου το λέει το OSM"}.
              {lookup.officialTerms ? " Οι όροι δόμησης μπήκαν από το ΤΕΕ." : " Σ.Δ. / Σ.Κ. βάλε τα στο χέρι αν δεν βρεθούν στο ΤΕΕ."}
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">Βρέθηκε το σημείο, όχι περίγραμμα κτιρίου. Βάλε διαστάσεις στο χέρι.</p>
          )}
          {neighborCount > 0 ? <p className="text-xs leading-relaxed text-muted-foreground">{neighborCount} γειτονικά κτίρια OSM (ύψος μόνο από OSM, αλλιώς 3 όροφοι).</p> : null}
          <p className="text-xs leading-relaxed text-muted-foreground">{lookup.officialNote}</p>
          <div className="flex flex-wrap gap-3">
            <a href={lookup.streetViewUrl} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">Google Street View</a>
            <a href={lookup.mapsUrl} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">Google Maps</a>
            <a href={lookup.osmUrl} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">OpenStreetMap</a>
            <a href={lookup.teeUrl} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">Χάρτης ΤΕΕ</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
