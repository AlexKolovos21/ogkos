import { stemWord } from "./address-parse.ts";

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

function fold(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

const CITY_KEYS = [
  "ΑΘΗΝ",
  "ATHENS",
  "ATHINA",
  "ΘΕΣΣΑΛΟΝΙΚ",
  "THESSALONIKI",
  "ΠΕΙΡΑΙ",
  "PIRAEUS",
  "ΠΕΡΙΣΤΕΡ",
  "ΚΑΛΛΙΘΕ",
  "ΓΛΥΦΑΔ",
  "ΝΙΚΑΙΑ",
  "ΗΡΑΚΛΕΙ",
  "ΠΑΤΡΑ",
  "ΛΑΡΙΣ",
];

function mentionedCity(q: string): string | null {
  for (const k of CITY_KEYS) {
    if (q.includes(k)) return k === "ATHENS" || k === "ATHINA" ? "ΑΘΗΝ" : k;
  }
  return null;
}

export function scorePlace(
  p: { street?: string; housenumber?: string; city?: string; suburb?: string; label?: string },
  query: string,
  house?: string | null,
): number {
  const q = fold(query);
  const blob = fold([p.city, p.suburb, p.label, p.street].filter(Boolean).join(" "));
  let s = 0;
  if (house && p.housenumber && p.housenumber === house) s += 45;
  else if (house && p.housenumber) s += 4;
  if (p.street) {
    const st = fold(p.street);
    const tokens = st.split(/\s+/).filter((w) => w.length >= 3);
    const hits = tokens.filter((w) => q.includes(w) || q.includes(stemWord(w))).length;
    s += hits * 22;
    const stem = stemWord(p.street);
    if (stem.length >= 4 && (q.includes(stem) || fold(query).includes(stem))) s += 16;
    if (tokens.length && hits === 0 && st.length >= 4 && q.includes(st.slice(0, 6))) s += 10;
  }
  if (p.city && q.includes(fold(p.city))) s += 12;
  if (p.suburb && q.includes(fold(p.suburb))) s += 16;
  if (p.label && fold(p.label).split(/\s+/).some((w) => w.length >= 5 && q.includes(w))) s += 4;
  const city = mentionedCity(q);
  if (city) {
    const inAthens =
      city === "ΑΘΗΝ" &&
      /ΚΥΨΕΛ|ΠΑΤΗΣΙ|ΕΞΑΡΧ|ΑΜΠΕΛΟΚ|ΠΑΓΚΡΑΤ|ΚΟΛΩΝ|ΠΛΑΚΑ|ΜΟΝΑΣΤΗΡΑΚ|ΝΕΑΠΟΛ|ΠΕΔΙΟΝ|ΓΚΥΖ|ΠΟΛΥΓΩΝ|ΙΛΙΣ|ΖΩΓΡΑΦ|ΝΕΟΣ ΚΟΣΜ|ΚΟΥΚΑΚ|ΠΕΤΡΑΛΩΝ|ΘΗΣΕΙ|ΨΥΡΡ|ΜΕΤΑΞΟΥΡ|ΑΚΑΔΗΜ|ΑΜΠΕΛΟΚΗΠ/.test(
        blob,
      );
    if (blob.includes(city) || (city === "ΑΘΗΝ" && (blob.includes("ATHENS") || blob.includes("ATHINA") || inAthens))) {
      s += 42;
    } else {
      s -= 60;
    }
  }
  return s;
}
