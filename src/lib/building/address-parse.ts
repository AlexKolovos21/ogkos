export type ParsedAddress = {
  original: string; greek: string; street: string; housenumber: string | null;
  city: string | null; locality: string | null; postcode: string | null;
  variants: string[]; structured: { street: string; city?: string; postalcode?: string };
};

export function foldEl(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

const DIGRAPHS: [string, string][] = [["th","θ"],["ch","χ"],["ps","ψ"],["ph","φ"],["ou","ου"],["ai","αι"],["ei","ει"],["oi","οι"],["mp","μπ"],["nt","ντ"],["gk","γκ"],["gg","γγ"],["ks","ξ"],["dh","δ"]];
const SINGLE: Record<string, string> = { a:"α",b:"β",v:"β",g:"γ",d:"δ",e:"ε",z:"ζ",h:"η",i:"ι",k:"κ",l:"λ",m:"μ",n:"ν",x:"ξ",o:"ο",p:"π",r:"ρ",s:"σ",t:"τ",y:"υ",f:"φ",w:"ω",u:"υ",j:"τζ",q:"κ",c:"κ" };

export function greeklishToGreek(raw: string): string {
  if (/[Α-ωΆ-ώ]/.test(raw)) return raw;
  let i = 0; let out = ""; const s = raw.toLowerCase();
  while (i < s.length) {
    const ch = s[i]!;
    if (!/[a-z]/.test(ch)) { out += raw[i]; i += 1; continue; }
    let hit = false;
    for (const [lat, el] of DIGRAPHS) {
      if (s.startsWith(lat, i)) { out += el; i += lat.length; hit = true; break; }
    }
    if (hit) continue;
    out += SINGLE[ch] ?? ch; i += 1;
  }
  return out.replace(/σ(?=[,.\s]|$)/g, "ς");
}

export type CityRow = { fold: string; name: string; kind: "city" | "locality"; lat?: number; lon?: number };

export const CITY_TABLE: CityRow[] = [
  { fold: "ΑΓΙΑ ΒΑΡΒΑΡ", name: "Αγία Βαρβάρα", kind: "city", lat: 37.9894, lon: 23.6601 },
  { fold: "ΑΓΙΑΣ ΒΑΡΒΑΡ", name: "Αγία Βαρβάρα", kind: "city", lat: 37.9894, lon: 23.6601 },
  { fold: "ΑΓ. ΒΑΡΒΑΡ", name: "Αγία Βαρβάρα", kind: "city", lat: 37.9894, lon: 23.6601 },
  { fold: "AGIA VARVARA", name: "Αγία Βαρβάρα", kind: "city", lat: 37.9894, lon: 23.6601 },
  { fold: "ΑΓΙΑ ΠΑΡΑΣΚΕΥ", name: "Αγία Παρασκευή", kind: "city", lat: 38.011, lon: 23.82 },
  { fold: "ΑΓΙΟΣ ΔΗΜΗΤΡΙ", name: "Άγιος Δημήτριος", kind: "city" },
  { fold: "ΑΓΙΟΙ ΑΝΑΡΓΥΡ", name: "Άγιοι Ανάργυροι", kind: "city" },
  { fold: "ΑΙΓΑΛΕΩ", name: "Αιγάλεω", kind: "city", lat: 37.992, lon: 23.682 },
  { fold: "AIGALEO", name: "Αιγάλεω", kind: "city" },
  { fold: "ΑΧΑΡΝ", name: "Αχαρνές", kind: "city" },
  { fold: "ΙΛΙΟΝ", name: "Ίλιον", kind: "city", lat: 38.033, lon: 23.703 },
  { fold: "ΙΛΙΟΥ", name: "Ίλιον", kind: "city", lat: 38.033, lon: 23.703 },
  { fold: "ΧΑΙΔΑΡ", name: "Χαϊδάρι", kind: "city" },
  { fold: "ΠΕΤΡΟΥΠΟΛ", name: "Πετρούπολη", kind: "city" },
  { fold: "ΚΟΡΥΔΑΛΛ", name: "Κορυδαλλός", kind: "city" },
  { fold: "ΝΙΚΑΙΑ", name: "Νίκαια", kind: "city" },
  { fold: "ΚΕΡΑΤΣΙΝ", name: "Κερατσίνι", kind: "city" },
  { fold: "ΠΕΙΡΑΙ", name: "Πειραιάς", kind: "city", lat: 37.943, lon: 23.647 },
  { fold: "PIRAEUS", name: "Πειραιάς", kind: "city" },
  { fold: "ΠΕΡΙΣΤΕΡ", name: "Περιστέρι", kind: "city", lat: 38.013, lon: 23.691 },
  { fold: "ΚΑΛΛΙΘΕ", name: "Καλλιθέα", kind: "city" },
  { fold: "ΓΛΥΦΑΔ", name: "Γλυφάδα", kind: "city" },
  { fold: "ΝΕΑ ΣΜΥΡΝ", name: "Νέα Σμύρνη", kind: "city" },
  { fold: "ΝΕΑ ΙΩΝΙΑ", name: "Νέα Ιωνία", kind: "city" },
  { fold: "ΧΑΛΑΝΔΡ", name: "Χαλάνδρι", kind: "city" },
  { fold: "ΚΗΦΙΣΙΑ", name: "Κηφισιά", kind: "city" },
  { fold: "ΜΑΡΟΥΣ", name: "Μαρούσι", kind: "city" },
  { fold: "ΑΜΑΡΟΥΣ", name: "Μαρούσι", kind: "city" },
  { fold: "ΖΩΓΡΑΦ", name: "Ζωγράφου", kind: "city" },
  { fold: "ΗΛΙΟΥΠΟΛ", name: "Ηλιούπολη", kind: "city" },
  { fold: "ΒΥΡΩΝ", name: "Βύρωνας", kind: "city" },
  { fold: "ΓΑΛΑΤΣ", name: "Γαλάτσι", kind: "city" },
  { fold: "ΠΑΛΑΙΟ ΦΑΛΗΡ", name: "Παλαιό Φάληρο", kind: "city" },
  { fold: "ΑΛΙΜΟΣ", name: "Άλιμος", kind: "city" },
  { fold: "ΑΡΓΥΡΟΥΠΟΛ", name: "Αργυρούπολη", kind: "city" },
  { fold: "ΘΕΣΣΑΛΟΝΙΚ", name: "Θεσσαλονίκη", kind: "city", lat: 40.64, lon: 22.94 },
  { fold: "THESSALONIKI", name: "Θεσσαλονίκη", kind: "city", lat: 40.64, lon: 22.94 },
  { fold: "ΠΑΤΡΑ", name: "Πάτρα", kind: "city", lat: 38.25, lon: 21.74 },
  { fold: "ΗΡΑΚΛΕΙ", name: "Ηράκλειο", kind: "city" },
  { fold: "ΛΑΡΙΣ", name: "Λάρισα", kind: "city" },
  { fold: "ΡΟΔΟΣ", name: "Ρόδος", kind: "city", lat: 36.44, lon: 28.22 },
  { fold: "ΡΟΔΟΥ", name: "Ρόδος", kind: "city", lat: 36.44, lon: 28.22 },
  { fold: "RHODES", name: "Ρόδος", kind: "city", lat: 36.44, lon: 28.22 },
  { fold: "ΑΘΗΝ", name: "Αθήνα", kind: "city", lat: 37.984, lon: 23.728 },
  { fold: "ATHENS", name: "Αθήνα", kind: "city", lat: 37.984, lon: 23.728 },
  { fold: "ATHINA", name: "Αθήνα", kind: "city", lat: 37.984, lon: 23.728 },
  { fold: "ΚΥΨΕΛ", name: "Κυψέλη", kind: "locality" },
  { fold: "ΠΑΤΗΣΙ", name: "Πατήσια", kind: "locality" },
  { fold: "ΕΞΑΡΧ", name: "Εξάρχεια", kind: "locality" },
  { fold: "ΠΑΓΚΡΑΤ", name: "Παγκράτι", kind: "locality" },
  { fold: "ΚΟΛΩΝΑΚ", name: "Κολωνάκι", kind: "locality" },
  { fold: "ΑΜΠΕΛΟΚΗΠ", name: "Αμπελόκηποι", kind: "locality" },
];

const POSTCODES: Record<string, string> = {
  "12351": "Αγία Βαρβάρα", "12350": "Αγία Βαρβάρα",
  "12241": "Αιγάλεω", "12242": "Αιγάλεω", "12243": "Αιγάλεω", "12244": "Αιγάλεω",
  "13121": "Ίλιον", "13122": "Ίλιον", "13123": "Ίλιον",
  "10431": "Αθήνα", "10432": "Αθήνα", "10433": "Αθήνα", "10434": "Αθήνα", "10435": "Αθήνα",
  "10436": "Αθήνα", "10437": "Αθήνα", "10438": "Αθήνα", "10439": "Αθήνα", "10440": "Αθήνα",
  "10441": "Αθήνα", "10442": "Αθήνα", "10443": "Αθήνα", "10444": "Αθήνα", "10445": "Αθήνα",
  "10446": "Αθήνα", "10447": "Αθήνα",
};

const STREET_ALIAS: Record<string, string> = {
  ΠΑΤΙΣΙΟΝ: "Πατησίων", ΠΑΤΗΣΙΟΝ: "Πατησίων", ΠΑΤΙΣΙΩΝ: "Πατησίων",
  ΣΥΓΓΡΟΥ: "Συγγρού", ΑΛΕΞΑΝΔΡΑΣ: "Αλεξάνδρας", ΚΗΦΙΣΙΑΣ: "Κηφισίας",
  ΑΧΑΡΝΩΝ: "Αχαρνών", ΠΑΝΕΠΙΣΤΗΜΙΟΥ: "Πανεπιστημίου", ΣΤΑΔΙΟΥ: "Σταδίου",
  ΠΕΙΡΑΙΩΣ: "Πειραιώς", ΠΕΙΡΑΙΟΣ: "Πειραιώς",
};

function aliasStreet(street: string): string {
  return STREET_ALIAS[foldEl(street)] ?? street;
}
function expandAbbrev(s: string): string {
  return s.replace(/\bλεωφ\.?\b/gi, "Λεωφόρος").replace(/\bleof\.?\b/gi, "Λεωφόρος").replace(/\bleoforos\b/gi, "Λεωφόρος").replace(/\bλ\.\s+/gi, "Λεωφόρος ").replace(/\bοδ\.?\b/gi, "Οδός").replace(/\bodos\b/gi, "Οδός").replace(/\bπλ\.?\b/gi, "Πλατεία").replace(/\bplateia\b/gi, "Πλατεία").replace(/\bδ\.\s*/gi, "Δήμος ").replace(/\s+/g, " ").trim();
}
function extractPostcode(q: string): string | null {
  return q.match(/\b([1-8]\d{4})\b/)?.[1] ?? null;
}
function extractHouse(q: string, postcode: string | null): string | null {
  const tokens = [...q.matchAll(/\d+[Α-Ωα-ωA-Za-z]?/g)].map((m) => m[0]);
  return tokens.find((t) => {
    const digits = t.replace(/\D/g, "");
    if (postcode && digits === postcode) return false;
    return digits.length >= 1 && digits.length <= 3;
  }) ?? null;
}

export function detectCity(folded: string): CityRow | null {
  const rows = [...CITY_TABLE].sort((a, b) => b.fold.length - a.fold.length);
  for (const row of rows) if (folded.includes(row.fold)) return row;
  return null;
}
export function cityBias(city: string | null): { lat: number; lon: number } {
  if (!city) return { lat: 37.984, lon: 23.728 };
  const row = CITY_TABLE.find((r) => r.name === city && r.lat !== undefined && r.lon !== undefined);
  if (row?.lat !== undefined && row.lon !== undefined) return { lat: row.lat, lon: row.lon };
  return { lat: 37.984, lon: 23.728 };
}
export function municNeedle(city: string): string {
  const f = foldEl(city).replace(/\bΔΗΜΟΣ\b/g, " ").replace(/\bΔ\.\b/g, " ").replace(/\s+/g, " ").trim();
  const tokens = f.split(/\s+/).filter((w) => w.length >= 4 && !["ΑΤΤΙΚΗ", "ΕΛΛΑΔΑ"].includes(w));
  const last = tokens[tokens.length - 1] ?? f;
  return last.replace(/(ΑΣ|ΗΣ|ΩΝ|ΟΥ|ΟΣ)$/g, "").slice(0, 8);
}

export function parseAddress(raw: string): ParsedAddress {
  const original = raw.replace(/\s+/g, " ").trim();
  const greek = expandAbbrev(greeklishToGreek(original));
  const folded = `${foldEl(original)} ${foldEl(greek)}`;
  const postcode = extractPostcode(original) ?? extractPostcode(greek);
  let city: string | null = postcode ? POSTCODES[postcode] ?? null : null;
  let locality: string | null = null;
  const detected = detectCity(folded);
  if (detected) {
    if (detected.kind === "city") city = city ?? detected.name;
    else locality = detected.name;
  }
  if (!city && detected?.kind === "locality") city = "Αθήνα";
  const house = extractHouse(greek, postcode);
  const cityNames = [...new Set(CITY_TABLE.map((r) => r.name))].join("|");
  let street = greek.replace(/,?\s*(Ελλάδα|Greece|ΑΤΤΙΚΗ|Attica)\s*$/i, "").replace(/Δήμος/gi, " ").replace(/Τ\.?\s*Κ\.?/gi, " ").replace(postcode ? new RegExp(postcode) : /(?!)/, " ").replace(house ? new RegExp(`(?:^|[^\\p{L}\\p{N}])${house}(?=$|[^\\p{L}\\p{N}])`, "iu") : /(?!)/, " ").replace(new RegExp(`(${cityNames}|Αθηνών)`, "gi"), " ").replace(/[,\s]+/g, " ").trim();
  if (city) {
    const last = city.split(/\s+/).pop()!.replace(/ς$/i, "");
    if (last.length >= 4) street = street.replace(new RegExp(`(?:Αγί[αάαςου]+\\s+)?${last}[α-ωά-ώΑ-Ω]*`, "gi"), " ").replace(/\s+/g, " ").trim();
  }
  if (!street) street = greek.split(",")[0]?.replace(house ?? "", "").trim() || greek;
  street = aliasStreet(street);
  const structuredStreet = house ? `${street} ${house}` : street;
  const variants = [original, greek, house && city ? `${street} ${house}, ${city}` : "", house && locality ? `${street} ${house}, ${locality}` : "", city ? `${structuredStreet}, ${city}, Ελλάδα` : `${structuredStreet}, Ελλάδα`, locality && city ? `${street} ${house ?? ""}, ${locality}, ${city}` : "", postcode && city ? `${structuredStreet}, ${city} ${postcode}` : ""].map((v) => v.replace(/\s+/g, " ").trim()).filter((v, i, arr) => v.length >= 3 && arr.indexOf(v) === i);
  return { original, greek, street, housenumber: house, city, locality, postcode, variants: variants.slice(0, 5), structured: { street: structuredStreet, city: city ?? locality ?? undefined, postalcode: postcode ?? undefined } };
}

export function stemWord(s: string): string {
  return foldEl(s).replace(/(ΩΝ|ΟΥ|ΗΣ|ΟΣ|ΑΣ|ΕΣ|ΕΙΣ|ΙΣ|ΟΝ)$/g, "");
}
export function formatPlaceLabel(p: { street?: string; housenumber?: string; suburb?: string; city?: string; label?: string }): string {
  const head = p.street ? (p.housenumber ? `${p.street} ${p.housenumber}` : p.street) : p.label;
  const tail = [p.suburb, p.city].filter(Boolean).join(", ");
  if (head && tail) return `${head}, ${tail}`;
  return head || p.label || "";
}
