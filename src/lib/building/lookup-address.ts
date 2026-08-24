import { createServerFn } from "@tanstack/react-start";
import { cityBias, formatPlaceLabel, parseAddress } from "./address-parse.ts";
import { fetchAround } from "./around.ts";
import { aabbOf, extractHouseNumber, houseMatched, metersPerDegree, parseOsmMap, pickBuilding, rotateYaw, streetFront, yawToFront, type OsmBuilding } from "./geo.ts";
import { cityMatches, OFFICIAL_NOTE, scorePlace, TEE_FOUND, TEE_MAP, type AddressLookupResult, type AddressPlace } from "./lookup.ts";
import { teeGeocodeMany, teeTerms } from "./tee.ts";

const UA = "OgkosBuildingStudy/1.0 (educational; address lookup)";

type NominatimHit = {
  lat?: string; lon?: string; display_name?: string; class?: string; type?: string;
  address?: { house_number?: string; road?: string; pedestrian?: string; suburb?: string; neighbourhood?: string; city?: string; town?: string; municipality?: string; postcode?: string; country_code?: string };
};

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const once = async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*", "Accept-Language": "el,en" }, signal: ctrl.signal });
      if (res.status === 429) throw new Error("RATE");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally { clearTimeout(t); }
  };
  try { return await once(); } catch (err) {
    if (!String(err).includes("RATE")) throw err;
    await new Promise((r) => setTimeout(r, 1100));
    return await once();
  }
}

const geoCache = new Map<string, { at: number; hits: NominatimHit[] }>();

async function nominatimSearch(params: Record<string, string>, timeoutMs: number): Promise<NominatimHit[]> {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("format", "json");
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("countrycodes", "gr");
  u.searchParams.set("limit", "10");
  u.searchParams.set("accept-language", "el");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const raw = await fetchText(u.toString(), timeoutMs);
  return JSON.parse(raw) as NominatimHit[];
}

async function geocode(query: string): Promise<NominatimHit[]> {
  const key = query.toLowerCase().replace(/\s+/g, " ").trim();
  const cached = geoCache.get(key);
  if (cached && Date.now() - cached.at < 30 * 60_000) return cached.hits;
  const parsed = parseAddress(query);
  const houseHint = parsed.housenumber;
  const hits: NominatimHit[] = [];
  const seen = new Set<string>();
  const pushAll = (rows: NominatimHit[]) => {
    for (const h of rows) {
      const k = `${h.lat},${h.lon}`;
      if (!h.lat || seen.has(k)) continue;
      seen.add(k); hits.push(h);
    }
  };
  if (parsed.structured.street) {
    const structured: Record<string, string> = { street: parsed.structured.street, country: "Greece" };
    if (parsed.structured.city) structured.city = parsed.structured.city;
    if (parsed.structured.postalcode) structured.postalcode = parsed.structured.postalcode;
    pushAll(await nominatimSearch(structured, 6_000).catch(() => []));
  }
  if (hits.length < 3) {
    const q = parsed.housenumber && parsed.city ? `${parsed.street} ${parsed.housenumber}, ${parsed.city}, Ελλάδα` : (parsed.variants[0] ?? query);
    pushAll(await nominatimSearch({ q }, 6_000).catch(() => []));
  }
  if (hits.length < 2) {
    const bias = cityBias(parsed.city);
    try {
      const raw = await fetchText(`https://photon.komoot.io/api/?q=${encodeURIComponent(parsed.greek)}&limit=10&lang=el&lat=${bias.lat}&lon=${bias.lon}`, 5_000);
      const json = JSON.parse(raw) as { features?: { geometry?: { coordinates?: number[] }; properties?: Record<string, string> }[] };
      const photon: NominatimHit[] = [];
      for (const f of json.features ?? []) {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;
        const p = f.properties ?? {};
        if (p.countrycode && p.countrycode !== "GR" && p.country !== "Greece") continue;
        photon.push({ lat: String(coords[1]), lon: String(coords[0]), display_name: p.name, class: p.osm_key, address: { house_number: p.housenumber, road: p.street ?? p.name, suburb: p.district ?? p.locality, city: p.city, postcode: p.postcode, country_code: p.countrycode } });
      }
      pushAll(photon);
    } catch { /* photon optional */ }
  }
  if (hits.length) { hits.sort((a, b) => scoreHit(b, houseHint, parsed) - scoreHit(a, houseHint, parsed)); geoCache.set(key, { at: Date.now(), hits }); }
  return hits;
}

function placeFromNominatim(h: NominatimHit): AddressPlace | null {
  const lat = Number(h.lat); const lon = Number(h.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const a = h.address ?? {};
  const place: AddressPlace = { label: "", lat, lon, city: a.city ?? a.town ?? a.municipality, suburb: a.suburb ?? a.neighbourhood, postcode: a.postcode, street: a.road ?? a.pedestrian, housenumber: a.house_number };
  place.label = formatPlaceLabel(place) || h.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  return place;
}

function scoreHit(h: NominatimHit, houseHint: string | null, parsed?: ReturnType<typeof parseAddress>): number {
  let s = 0; const a = h.address ?? {};
  if (h.class === "building") s += 8;
  if (houseHint && a.house_number === houseHint) s += 16; else if (a.house_number) s += 3;
  if (h.class === "highway" && a.road) s += 4;
  if (parsed?.city) {
    const blob = `${a.city ?? ""} ${a.town ?? ""} ${a.municipality ?? ""} ${a.suburb ?? ""}`;
    if (cityMatches(blob, parsed.city)) s += 24; else s -= 40;
  }
  if (parsed?.locality && (a.suburb ?? a.neighbourhood ?? "").includes(parsed.locality.slice(0, 4))) s += 8;
  return s;
}

function coordsFromQuery(q: string): { lat: number; lon: number } | null {
  const at = q.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/); if (at) return { lat: Number(at[1]), lon: Number(at[2]) };
  const qq = q.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/); if (qq) return { lat: Number(qq[1]), lon: Number(qq[2]) };
  const ll = q.match(/[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/); if (ll) return { lat: Number(ll[1]), lon: Number(ll[2]) };
  const pair = q.match(/^\s*(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})\s*$/);
  if (pair) { const lat = Number(pair[1]); const lon = Number(pair[2]); if (lat >= 34 && lat <= 42 && lon >= 19 && lon <= 30) return { lat, lon }; }
  return null;
}

function rankPlaces(query: string, houseHint: string | null, teePlaces: { label: string; lat: number; lon: number; city?: string; street?: string; housenumber?: string }[], nom: AddressPlace[]): AddressPlace[] {
  const ranked = [
    ...teePlaces.map((p) => ({ p: { label: formatPlaceLabel(p) || p.label, lat: p.lat, lon: p.lon, city: p.city, street: p.street, housenumber: p.housenumber } satisfies AddressPlace, s: scorePlace(p, query, houseHint) + 4 })),
    ...nom.map((p) => ({ p: { ...p, label: formatPlaceLabel(p) || p.label }, s: scorePlace(p, query, houseHint) })),
  ].sort((a, b) => b.s - a.s).filter((r) => r.s >= 20);
  const out: AddressPlace[] = []; const seen = new Set<string>();
  for (const r of ranked) {
    const key = `${r.p.lat.toFixed(5)},${r.p.lon.toFixed(5)}`;
    if (seen.has(key)) continue; seen.add(key); out.push(r.p);
  }
  return out;
}

export const suggestAddress = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const query = typeof d === "object" && d && "query" in d ? String((d as { query: unknown }).query) : "";
    const q = query.trim().slice(0, 180);
    if (q.length < 3) throw new Error("short");
    return { query: q };
  })
  .handler(async ({ data }): Promise<{ query: string; places: AddressPlace[] }> => {
    const query = data.query;
    const parsed = parseAddress(query);
    const houseHint = parsed.housenumber;
    const teePlaces = await teeGeocodeMany(query, houseHint, { street: parsed.street, city: parsed.city ?? undefined }).catch(() => []);
    const hits = parsed.city && teePlaces.length ? ([] as NominatimHit[]) : await geocode(query).catch(() => [] as NominatimHit[]);
    const nom = hits.map((h) => placeFromNominatim(h)).filter(Boolean) as AddressPlace[];
    return { query, places: rankPlaces(query, houseHint, teePlaces, nom).slice(0, 8) };
  });

export const lookupAddress = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const o = typeof d === "object" && d ? (d as Record<string, unknown>) : {};
    const q = String(o.query ?? "").trim().slice(0, 180);
    if (q.length < 3) throw new Error("Γράψε τουλάχιστον 3 χαρακτήρες.");
    const lat = typeof o.lat === "number" ? o.lat : Number(o.lat);
    const lon = typeof o.lon === "number" ? o.lon : Number(o.lon);
    return { query: q, lat: Number.isFinite(lat) ? lat : undefined, lon: Number.isFinite(lon) ? lon : undefined, street: typeof o.street === "string" ? o.street : undefined, housenumber: typeof o.housenumber === "string" ? o.housenumber : undefined, city: typeof o.city === "string" ? o.city : undefined, suburb: typeof o.suburb === "string" ? o.suburb : undefined };
  })
  .handler(async ({ data }): Promise<AddressLookupResult> => {
    const query = data.query;
    const empty = (error?: string): AddressLookupResult => ({ query, place: null, building: null, houseMatch: false, candidates: [], neighbors: [], streets: [], heading: 0, suggestions: [], context: null, officialTerms: null, officialNote: OFFICIAL_NOTE, osmUrl: "https://www.openstreetmap.org/", mapsUrl: "https://www.google.com/maps", teeUrl: TEE_MAP, streetViewUrl: "https://www.google.com/maps", error });
    let place: AddressPlace | null = null;
    let suggestions: AddressPlace[] = [];
    const pinned = data.lat !== undefined && data.lon !== undefined ? { lat: data.lat, lon: data.lon } : coordsFromQuery(query);
    const parsed = parseAddress(query);
    const houseHint = parsed.housenumber ?? extractHouseNumber(query);
    try {
      if (pinned) {
        place = { label: query, lat: pinned.lat, lon: pinned.lon, street: data.street, housenumber: data.housenumber, city: data.city, suburb: data.suburb };
      } else {
        const teePlaces = await teeGeocodeMany(parsed.greek, houseHint, { street: parsed.street, city: parsed.city ?? undefined }).catch(() => []);
        const hits = parsed.city && teePlaces.length ? ([] as NominatimHit[]) : await geocode(query).catch(() => [] as NominatimHit[]);
        const nom = hits.map((h) => placeFromNominatim(h)).filter(Boolean) as AddressPlace[];
        suggestions = rankPlaces(query, houseHint, teePlaces, nom);
        place = suggestions[0] ?? null;
      }
    } catch (err) {
      const rate = String(err).includes("RATE");
      return empty(rate ? "Ο χάρτης ζήτησε λίγο χρόνο. Ξαναπάτα Εύρεση σε ένα δευτερόλεπτο." : "Η αναζήτηση διεύθυνσης απέτυχε. Δοκίμασε ξανά σε λίγο.");
    }
    if (!place) return empty("Δεν βρέθηκε αυτή η διεύθυνση.");
    const osmUrl = `https://www.openstreetmap.org/#map=19/${place.lat.toFixed(6)}/${place.lon.toFixed(6)}`;
    const mapsUrl = `https://www.google.com/maps?q=${place.lat.toFixed(6)},${place.lon.toFixed(6)}`;
    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${place.lat.toFixed(6)},${place.lon.toFixed(6)}`;
    const house = houseHint ?? place.housenumber ?? null;
    const osmP = (async () => {
      const dlat = 0.001; const dlon = 0.0012;
      const bbox = `${place.lon - dlon},${place.lat - dlat},${place.lon + dlon},${place.lat + dlat}`;
      const xml = await fetchText(`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox}`, 8_000);
      return parseOsmMap(xml, { lat: place.lat, lon: place.lon });
    })().catch(() => ({ buildings: [] as OsmBuilding[], streets: [] }));
    const [map, officialTerms] = await Promise.all([osmP, teeTerms(place.lat, place.lon).catch(() => null)]);
    const all = map.buildings;
    const picked = pickBuilding(all, house, place.street);
    const match = houseMatched(picked, house);
    let building = picked;
    const originId = building?.id;
    const neighbors = all.filter((b) => b.id !== originId && b.area >= 40).slice(0, 12);
    const deg = metersPerDegree(place.lat);
    const ox = building ? (building.lon - place.lon) * deg.lon : 0;
    const oz = building ? (building.lat - place.lat) * deg.lat : 0;
    const front = streetFront(map.streets, ox, oz);
    const heading = front ? yawToFront(front.fx, front.fz) : 0;
    if (building?.points && building.points.length >= 3) {
      const rot = building.points.map((p) => rotateYaw(p.x - ox, p.z - oz, heading));
      const box = aabbOf(rot);
      building = { ...building, width: Math.round(box.width * 10) / 10, depth: Math.round(box.depth * 10) / 10 };
    }
    return { query, place, building, houseMatch: match, candidates: all.slice(0, 8), neighbors, streets: map.streets.slice(0, 20), heading, suggestions: suggestions.filter((s) => s.lat !== place.lat || s.lon !== place.lon).slice(0, 7), context: null, officialTerms, officialNote: officialTerms ? TEE_FOUND : OFFICIAL_NOTE, osmUrl, mapsUrl, teeUrl: TEE_MAP, streetViewUrl };
  });

export const lookAround = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const o = typeof d === "object" && d ? (d as { lat?: unknown; lon?: unknown }) : {};
    const lat = Number(o.lat); const lon = Number(o.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("coords");
    return { lat, lon };
  })
  .handler(async ({ data }) => fetchAround(data.lat, data.lon));
