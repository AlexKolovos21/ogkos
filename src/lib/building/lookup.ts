import { detectCity, foldEl, municNeedle, parseAddress, stemWord } from "./address-parse.ts";

export type AddressPlace = {
  label: string;
  lat: number;
  lon: number;
  city?: string;
  suburb?: string;
  postcode?: string;
  street?: string;
  housenumber?: string;
};

export type { OfficialTerms } from "./tee.ts";
export type { AddressContext } from "./around.ts";

export type AddressLookupResult = {
  query: string;
  place: AddressPlace | null;
  building: import("./geo.ts").OsmBuilding | null;
  houseMatch: boolean;
  candidates: import("./geo.ts").OsmBuilding[];
  neighbors: import("./geo.ts").OsmBuilding[];
  streets: import("./geo.ts").OsmStreet[];
  heading: number;
  suggestions: AddressPlace[];
  context: import("./around.ts").AddressContext | null;
  officialTerms: import("./tee.ts").OfficialTerms | null;
  officialNote: string;
  osmUrl: string;
  mapsUrl: string;
  teeUrl: string;
  streetViewUrl: string;
  error?: string;
};

export const OFFICIAL_NOTE =
  "Δεν βρέθηκαν όροι δόμησης στον Ενιαίο Ψηφιακό Χάρτη ΤΕΕ για αυτό το σημείο. Δεν συμπληρώνονται ψεύτικοι αριθμοί.";

export const TEE_FOUND =
  "Όροι δόμησης από τον Ενιαίο Ψηφιακό Χάρτη ΤΕΕ. Ενδεικτική εφαρμογή — έλεγξε το ΦΕΚ.";

export const TEE_MAP = "https://sdigmap.tee.gov.gr/sdmquery/public/";

const ISLAND = ["ΡΟΔ", "ΛΕΣΒ", "ΜΥΤΙΛΗΝ", "ΧΙΟ", "ΚΕΡΚΥΡ", "ΣΥΡ", "ΘΗΡΑ", "ΣΑΝΤΟΡ", "ΜΥΚΟΝ", "ΝΑΞ", "ΠΑΡΟΣ", "ΚΩΣ", "ΣΑΜΟ", "ΛΗΜΝ", "ΖΑΚΥΝΘ", "ΚΕΦΑΛΛΗΝ", "ΛΕΥΚΑΔ"];

export function streetCore(addr: string): string {
  return foldEl(addr).replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
}

export function streetMatches(got: string | undefined, want: string | undefined): boolean {
  if (!got || !want) return false;
  const a = streetCore(got);
  const b = streetCore(want);
  if (a.length < 4 || b.length < 4) return false;
  if (a === b || a.startsWith(b + " ") || b.startsWith(a + " ")) return true;
  const wt = b.split(/\s+/).filter((w) => w.length >= 3);
  if (wt.length === 0) return false;
  return wt.every((w) => a.includes(w));
}

export function cityMatches(got: string | undefined, want: string | undefined): boolean {
  if (!got || !want) return false;
  const needle = municNeedle(want);
  // A short-but-real stem (e.g. "Βόλος" -> "ΒΟΛ") is still the right thing
  // to match on. The previous fallback for needle.length < 4 compared the
  // raw nominative form instead, which fails against the genitive endings
  // Greek municipality names normally use ("Δήμος Βόλου" has no "ΒΟΛΟΣ"
  // substring at all) — silently rejecting a correct match.
  if (!needle) return foldEl(got).includes(foldEl(want).slice(0, 5));
  return foldEl(got).includes(needle);
}

export function mentionsIsland(query: string): boolean {
  return ISLAND.some((k) => foldEl(query).includes(k));
}

export function looksIsland(p: { city?: string; suburb?: string; label?: string; lat?: number; lon?: number }): boolean {
  const blob = foldEl([p.city, p.suburb, p.label].filter(Boolean).join(" "));
  if (ISLAND.some((k) => blob.includes(k))) return true;
  if (typeof p.lon === "number" && p.lon > 24.55) return true;
  if (typeof p.lat === "number" && p.lat < 36.65) return true;
  return false;
}

export function inAttica(lat: number, lon: number): boolean {
  return lat >= 37.72 && lat <= 38.35 && lon >= 23.38 && lon <= 24.15;
}

export function scorePlace(
  p: { street?: string; housenumber?: string; city?: string; suburb?: string; label?: string; lat?: number; lon?: number },
  query: string,
  house?: string | null,
): number {
  const parsed = parseAddress(query);
  const q = foldEl(query);
  let s = 0;
  if (house && p.housenumber && p.housenumber === house) s += 45;
  else if (house && p.housenumber) s += 4;
  if (p.street) {
    if (streetMatches(p.street, parsed.street)) s += 70;
    else {
      const st = foldEl(p.street);
      const tokens = st.split(/\s+/).filter((w) => w.length >= 3);
      const hits = tokens.filter((w) => q.includes(w) || q.includes(stemWord(w))).length;
      s += hits * 8;
      if (tokens.length && hits === 0) s -= 30;
    }
  }
  if (p.city && q.includes(foldEl(p.city))) s += 12;
  if (p.suburb && q.includes(foldEl(p.suburb))) s += 16;
  const wantCity = parsed.city ?? detectCity(q)?.name ?? null;
  if (wantCity) {
    if (cityMatches(p.city, wantCity) || cityMatches(p.suburb, wantCity) || cityMatches(p.label, wantCity)) s += 80;
    else s -= 220;
  } else if (!mentionsIsland(query) && looksIsland(p)) {
    s -= 120;
  }
  if (typeof p.lat === "number" && typeof p.lon === "number" && inAttica(p.lat, p.lon) && !wantCity) s += 12;
  return s;
}

export function keepPlace(
  p: { street?: string; housenumber?: string; city?: string; suburb?: string; label?: string; lat?: number; lon?: number },
  query: string,
  house?: string | null,
): boolean {
  return scorePlace(p, query, house) >= 20;
}
