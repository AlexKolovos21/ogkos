import { foldEl } from "./address-parse.ts";

export type TeePlace = {
  label: string;
  lat: number;
  lon: number;
  city?: string;
  street?: string;
  housenumber?: string;
};
const UA = "OgkosBuildingStudy/1.0 (educational; tee lookup)";
const BASE = "https://sdigmap.tee.gov.gr/mapping/rest/services/UDM";
const PLAN = `${BASE}/UDM_SERVICE_POLEODOMIKI_PLIROFORIA/MapServer`;
const ADDR = `${BASE}/UDM_SERVICE_BUILDINGS/MapServer/1`;

export type OfficialTerms = {
  far?: number;
  coverage?: number;
  maxHeight?: number;
  floors?: number;
  system?: "continuous" | "detached";
  fek?: string;
  notes: string[];
  source: "tee";
};

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function attrs(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return {};
  const a = (obj as { attributes?: Record<string, unknown> }).attributes;
  return a && typeof a === "object" ? a : {};
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", ".").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s || s === "Null" || s === "null") return undefined;
  return s;
}

export function parseCoverage(raw: number): number {
  if (raw > 1.5) return Math.min(0.95, raw / 100);
  return Math.min(0.95, Math.max(0.05, raw));
}

function parseSystem(raw?: string): OfficialTerms["system"] | undefined {
  if (!raw) return undefined;
  const s = foldEl(raw);
  if (s.includes("ΣΥΝΕΧ")) return "continuous";
  if (s.includes("ΠΑΝΤΑΧΟΘΕΝ") || s.includes("ΕΛΕΥΘΕΡ")) return "detached";
  return undefined;
}

function esc(s: string) {
  return s.replace(/'/g, "");
}

function addrClause(phrase: string): string {
  const likes = [`ADDR LIKE '%${esc(phrase)}%'`];
  if (phrase.includes("ΑΓΙΟΥ ")) likes.push(`ADDR LIKE '%${esc(phrase.replace("ΑΓΙΟΥ ", "ΑΓ. "))}%'`);
  if (phrase.includes("ΑΓΙΑΣ ")) likes.push(`ADDR LIKE '%${esc(phrase.replace("ΑΓΙΑΣ ", "ΑΓ. "))}%'`);
  return likes.length === 1 ? likes[0]! : `(${likes.join(" OR ")})`;
}

function municToken(city: string): string {
  const f = foldEl(city).replace(/\b(ΔΗΜΟΣ|ΔΗΜΟΥ|ΑΤΤΙΚΗ|ΕΛΛΑΔΑ)\b/g, " ").replace(/\bΔ\.\s*/g, " ").replace(/\s+/g, " ").trim();
  const tokens = f.split(/\s+/).filter((w) => w.length >= 4);
  const last = tokens[tokens.length - 1] ?? f.replace(/\s+/g, "");
  return last.replace(/(ΑΣ|ΗΣ|ΩΝ|ΟΥ|ΟΣ)$/g, "").slice(0, 8);
}

function municFromQuery(query: string): string | null {
  const f = foldEl(query);
  if (f.includes("ΒΑΡΒΑΡ")) return "ΒΑΡΒΑΡ";
  return null;
}

function addrMatches(addrFold: string, phrase: string): boolean {
  const core = addrFold.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  if (core === phrase || core.startsWith(phrase + " ")) return true;
  const tokens = phrase.split(/\s+/).filter((w) => w.length >= 3);
  return tokens.length > 0 && tokens.every((w) => core.includes(w));
}

async function teeQuery(where: string) {
  const u = new URL(`${ADDR}/query`);
  u.searchParams.set("f", "json");
  u.searchParams.set("where", where);
  u.searchParams.set("outFields", "ADDR,NUM,MUNIC");
  u.searchParams.set("returnGeometry", "true");
  u.searchParams.set("outSR", "4326");
  u.searchParams.set("resultRecordCount", "20");
  const data = (await getJson(u.toString(), 8_000)) as { features?: { attributes?: Record<string, unknown>; geometry?: { x?: number; y?: number } }[] };
  return data.features ?? [];
}

export async function teeGeocodeMany(query: string, house?: string | null, parsed?: { street?: string; city?: string }): Promise<TeePlace[]> {
  const streetSrc = (parsed?.street || query).trim();
  const streetFold = foldEl(streetSrc).replace(/\b(ΟΔΟΣ|ΛΕΩΦΟΡΟΣ|ΔΗΜΟΣ|ΕΛΛΑΔΑ|ΑΤΤΙΚΗ)\b/g, " ").replace(/[^\p{L}\p{N}\s.]/gu, " ").replace(/\s+/g, " ").trim();
  const streetTokens = streetFold.split(/\s+/).filter((w) => w.length >= 3 && !/^\d+$/.test(w));
  const streetPhrase = streetTokens.slice(0, 4).join(" ");
  const munic = parsed?.city ? municToken(parsed.city) : municFromQuery(query);
  const attempts: string[] = [];
  if (streetPhrase.length >= 4 && house) {
    const addr = addrClause(streetPhrase);
    if (munic) {
      attempts.push(`${addr} AND NUM='${esc(house)}' AND MUNIC LIKE '%${esc(munic)}%'`);
      attempts.push(`${addr} AND MUNIC LIKE '%${esc(munic)}%'`);
    } else attempts.push(`${addr} AND NUM='${esc(house)}'`);
  } else if (streetPhrase.length >= 4) {
    const addr = addrClause(streetPhrase);
    if (munic) attempts.push(`${addr} AND MUNIC LIKE '%${esc(munic)}%'`);
    else attempts.push(addr);
  } else if (house && munic) {
    attempts.push(`NUM='${esc(house)}' AND MUNIC LIKE '%${esc(munic)}%'`);
  }
  let featsAll: { attributes?: Record<string, unknown>; geometry?: { x?: number; y?: number } }[] = [];
  for (const where of attempts) {
    const got = await teeQuery(where);
    if (got.length) { featsAll = got; break; }
  }
  const houseHits = house ? featsAll.filter((f) => (str(f.attributes?.NUM) ?? "") === house) : featsAll;
  const feats = houseHits.length ? houseHits : house ? [] : featsAll;
  const qFold = foldEl(query);
  const rank = (f: (typeof feats)[0]) => {
    const A = foldEl(str(f.attributes?.ADDR) ?? "");
    const N = str(f.attributes?.NUM) ?? "";
    const M = foldEl(str(f.attributes?.MUNIC) ?? "");
    let s = 0;
    if (house && N === house) s += 40;
    if (streetPhrase && !addrMatches(A, streetPhrase)) s -= 80;
    else if (streetPhrase && A.includes(streetPhrase)) s += 50;
    else s += streetTokens.filter((w) => A.includes(w)).length * 16;
    if (munic && M.includes(munic)) s += 55;
    else if (munic && !M.includes(munic)) s -= 45;
    const lat = f.geometry?.y; const lon = f.geometry?.x;
    if (!munic && typeof lat === "number" && typeof lon === "number") {
      if (lat >= 37.72 && lat <= 38.35 && lon >= 23.38 && lon <= 24.15) s += 25;
      if (lon > 24.55 || lat < 36.65) s -= 50;
    }
    if (qFold && M && qFold.includes(municToken(M))) s += 10;
    return s;
  };
  const out: TeePlace[] = [];
  const seen = new Set<string>();
  for (const f of [...feats].sort((a, b) => rank(b) - rank(a))) {
    if (rank(f) < 20) continue;
    const A = foldEl(str(f.attributes?.ADDR) ?? "");
    const M = foldEl(str(f.attributes?.MUNIC) ?? "");
    if (munic && !M.includes(munic)) continue;
    if (streetPhrase && !addrMatches(A, streetPhrase)) continue;
    const x = f.geometry?.x; const y = f.geometry?.y;
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    const key = `${y.toFixed(5)},${x.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const street = str(f.attributes?.ADDR);
    const numStr = str(f.attributes?.NUM);
    const municName = str(f.attributes?.MUNIC);
    out.push({
      label: [street && numStr ? `${street} ${numStr}` : street, municName].filter(Boolean).join(", ") || query,
      lat: y, lon: x, city: municName, street: street ?? undefined, housenumber: numStr ?? undefined,
    });
    if (out.length >= 8) break;
  }
  return out;
}

export async function teeGeocode(query: string, house?: string | null): Promise<TeePlace | null> {
  const all = await teeGeocodeMany(query, house);
  return all[0] ?? null;
}

export async function teeTerms(lat: number, lon: number): Promise<OfficialTerms | null> {
  const q = (layer: number, fields: string) => {
    const u = new URL(`${PLAN}/${layer}/query`);
    u.searchParams.set("f", "json");
    u.searchParams.set("geometry", `${lon},${lat}`);
    u.searchParams.set("geometryType", "esriGeometryPoint");
    u.searchParams.set("inSR", "4326");
    u.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    u.searchParams.set("outFields", fields);
    u.searchParams.set("returnGeometry", "false");
    u.searchParams.set("resultRecordCount", "1");
    return getJson(u.toString(), 5_000) as Promise<{ features?: unknown[] }>;
  };
  const [farR, covR, hR, sysR] = await Promise.allSettled([
    q(20, "SD_TIMH,FEK"),
    q(18, "SYNT_KALYPSIS,FEK"),
    q(16, "MAX_HEIGHT_M,NUM_OROFON,FEK,OROR_MAX_HEIGHT_COMMENT,OROR_NUM_OROFON_COMMENT"),
    q(19, "OIK_SYSTHMA,FEK"),
  ]);
  const farA = farR.status === "fulfilled" ? attrs(farR.value.features?.[0]) : {};
  const covA = covR.status === "fulfilled" ? attrs(covR.value.features?.[0]) : {};
  const hA = hR.status === "fulfilled" ? attrs(hR.value.features?.[0]) : {};
  const sysA = sysR.status === "fulfilled" ? attrs(sysR.value.features?.[0]) : {};
  const far = num(farA.SD_TIMH);
  const covRaw = num(covA.SYNT_KALYPSIS);
  const height = num(hA.MAX_HEIGHT_M);
  const floors = num(hA.NUM_OROFON);
  const system = parseSystem(str(sysA.OIK_SYSTHMA));
  const fek = str(hA.FEK) || str(farA.FEK) || str(covA.FEK) || str(sysA.FEK);
  const notes: string[] = [];
  const hc = str(hA.OROR_MAX_HEIGHT_COMMENT);
  const fc = str(hA.OROR_NUM_OROFON_COMMENT);
  if (hc) notes.push(hc);
  if (fc) notes.push(fc);
  let maxHeight = height;
  if (maxHeight === undefined && floors && floors >= 1) {
    maxHeight = Math.round(floors * 3.2 * 10) / 10;
    notes.push(`Ύψος από ${floors} ορόφους × 3,2 μ. (δεν δόθηκε μέγιστο ύψος στο ΤΕΕ).`);
  }
  if (far === undefined && covRaw === undefined && maxHeight === undefined && !system) return null;
  return {
    far: far !== undefined && far > 0 && far < 12 ? far : undefined,
    coverage: covRaw !== undefined ? parseCoverage(covRaw) : undefined,
    maxHeight: maxHeight !== undefined && maxHeight >= 4 && maxHeight <= 50 ? maxHeight : undefined,
    floors: floors && floors >= 1 && floors <= 20 ? floors : undefined,
    system, fek, notes, source: "tee",
  };
}
