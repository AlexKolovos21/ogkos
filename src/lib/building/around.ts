export type NearbyPlace = { name: string; kind: string; distM: number };
export type WikiHit = { title: string; url: string; distM: number };
export type StreetPhoto = { url: string; title: string };

export type AddressContext = {
  reverseLabel?: string;
  elevationM?: number;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  postcode?: string;
  nearby: NearbyPlace[];
  wiki: WikiHit[];
  photos: StreetPhoto[];
  streetViewUrl: string;
  mapsEmbedUrl: string;
};

const UA = "OgkosBuildingStudy/1.0 (educational; address lookup)";

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchAround(lat: number, lon: number): Promise<AddressContext> {
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat.toFixed(6)},${lon.toFixed(6)}`;
  const mapsEmbedUrl = `https://maps.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}&hl=el&z=19&output=embed`;
  const empty: AddressContext = { nearby: [], wiki: [], photos: [], streetViewUrl, mapsEmbedUrl };

  const reverseP = getJson(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18&accept-language=el`,
    6_000,
  ).catch(() => null);

  const wikiP = getJson(
    `https://el.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=400&gslimit=5&format=json&origin=*`,
    6_000,
  ).catch(() => null);

  const photoP = getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=250&gslimit=6&gsnamespace=6&format=json&origin=*`,
    6_000,
  ).catch(() => null);

  const elevP = getJson(
    `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
    5_000,
  ).catch(() => null);

  const [rev, wiki, photo, elev] = await Promise.all([reverseP, wikiP, photoP, elevP]);

  const addr =
    rev && typeof rev === "object"
      ? (rev as { display_name?: string; address?: Record<string, string> })
      : null;
  if (addr?.display_name) empty.reverseLabel = addr.display_name;
  const a = addr?.address ?? {};
  empty.city = a.city || a.town || a.municipality;
  empty.suburb = a.suburb || a.neighbourhood;
  empty.neighbourhood = a.neighbourhood || a.quarter;
  empty.postcode = a.postcode;

  const gsw = (wiki as { query?: { geosearch?: { title?: string; pageid?: number; dist?: number }[] } } | null)
    ?.query?.geosearch;
  if (gsw) {
    empty.wiki = gsw
      .filter((w) => w.title)
      .slice(0, 4)
      .map((w) => ({
        title: w.title!,
        url: `https://el.wikipedia.org/wiki/${encodeURIComponent(w.title!)}`,
        distM: Math.round(w.dist ?? 0),
      }));
  }

  const gsp = (photo as { query?: { geosearch?: { title?: string }[] } } | null)?.query?.geosearch;
  if (gsp) {
    empty.photos = gsp
      .filter((p) => p.title && p.title.startsWith("File:"))
      .slice(0, 4)
      .map((p) => ({
        title: p.title!.replace(/^File:/, ""),
        url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.title!.replace(/^File:/, ""))}?width=360`,
      }));
  }

  const ev = elev as { elevation?: number[] } | null;
  if (ev?.elevation && Number.isFinite(ev.elevation[0])) empty.elevationM = Math.round(ev.elevation[0]!);

  return empty;
}
