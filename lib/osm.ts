/**
 * Overpass API helper — server-side only.
 * Fetches road/POI data from OpenStreetMap without exposing any API keys.
 */

const OVERPASS_URL =
  process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";

export type RoadType =
  | "track"
  | "path"
  | "residential"
  | "unclassified"
  | "tertiary"
  | "secondary"
  | "primary"
  | "motorway"
  | "none";

/**
 * Query the nearest road type for a coordinate.
 * Returns the highway tag value or "none".
 */
export async function getNearestRoadType(
  lat: number,
  lng: number,
  radiusMeters = 200
): Promise<RoadType> {
  const query = `
    [out:json][timeout:10];
    way(around:${radiusMeters},${lat},${lng})[highway];
    out tags 1;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) return "none";

  const data = await res.json();
  const elements: Array<{ tags?: { highway?: string } }> = data.elements ?? [];
  if (elements.length === 0) return "none";
  return (elements[0].tags?.highway ?? "none") as RoadType;
}

/**
 * Count nearby POI nodes (pubs, restaurants, shops, tourist_info, etc.)
 * Lower count → lower footfall → better hidden spot.
 */
export async function countNearbyPOIs(
  lat: number,
  lng: number,
  radiusMeters = 500
): Promise<number> {
  const query = `
    [out:json][timeout:10];
    (
      node(around:${radiusMeters},${lat},${lng})[amenity];
      node(around:${radiusMeters},${lat},${lng})[tourism];
      node(around:${radiusMeters},${lat},${lng})[shop];
    );
    out count;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) return 0;

  const data = await res.json();
  return data.elements?.[0]?.tags?.total ?? 0;
}

/**
 * Derive terrain type from natural/landuse tags near a coordinate.
 */
export async function getTerrainType(
  lat: number,
  lng: number
): Promise<string> {
  const query = `
    [out:json][timeout:10];
    (
      way(around:300,${lat},${lng})[natural];
      way(around:300,${lat},${lng})[landuse];
    );
    out tags 1;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) return "Unknown";

  const data = await res.json();
  const elem = data.elements?.[0];
  if (!elem) return "Open Land";

  const natural = elem.tags?.natural;
  const landuse = elem.tags?.landuse;

  const map: Record<string, string> = {
    forest: "Forest",
    wood: "Forest",
    grassland: "Grassland",
    heath: "Heathland",
    scrub: "Scrubland",
    water: "Waterside",
    wetland: "Wetland",
    beach: "Beach",
    cliff: "Cliff",
    meadow: "Meadow",
    farmland: "Farmland",
    residential: "Rural Settlement",
  };

  return map[natural ?? ""] ?? map[landuse ?? ""] ?? "Open Land";
}

// ── Ignored highway types (too busy) ─────────────────────────────────────────
export const BUSY_ROADS = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
]);
