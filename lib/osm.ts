/**
 * Overpass API helper — server-side only.
 * Fetches road/POI/terrain data from OpenStreetMap without exposing any API keys.
 */

const OVERPASS_URL =
  process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";

const OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup";

export type TerrainFilter = "hill" | "forest" | "lake" | "beach" | "straight_road";
export type RoadFilter = "paved" | "unpaved" | "trekking";

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

export interface Facility {
  type: "hospital" | "police" | "railway_station" | "bus_stop";
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

// ── Core Overpass fetch ──────────────────────────────────────────────────────

async function queryOverpass(query: string): Promise<unknown> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error("Overpass API error");
  return res.json();
}

// ── Haversine distance ──────────────────────────────────────────────────────

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Elevation ────────────────────────────────────────────────────────────────

export async function getElevation(lat: number, lng: number): Promise<number | null> {
  try {
    // First try Overpass ele tags on nearby peaks/nodes
    const overpassQuery = `
      [out:json][timeout:8];
      node(around:500,${lat},${lng})["ele"];
      out 1;
    `;
    const data = (await queryOverpass(overpassQuery)) as {
      elements: { tags?: { ele?: string } }[];
    };
    if (data.elements?.[0]?.tags?.ele) {
      return Math.round(parseFloat(data.elements[0].tags.ele));
    }

    // Fallback to Open-Elevation API
    const res = await fetch(
      `${OPEN_ELEVATION_URL}?locations=${lat},${lng}`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (res.ok) {
      const json = await res.json();
      const elev = json.results?.[0]?.elevation;
      if (typeof elev === "number") return Math.round(elev);
    }
    return null;
  } catch {
    return null;
  }
}

// ── Scenic road (original) ──────────────────────────────────────────────────

export async function getScenicRoadNear(
  lat: number,
  lng: number,
  radiusMeters = 3000
): Promise<{ type: string; lat: number; lng: number } | null> {
  const query = `
    [out:json][timeout:10];
    way(around:${radiusMeters},${lat},${lng})[highway~"^(unclassified|track|path|tertiary|dirt|bridleway)$"];
    out center 1;
  `;

  try {
    const data = (await queryOverpass(query)) as {
      elements: { center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
    };
    if (!data.elements?.length) return null;
    const center = data.elements[0].center;
    if (!center) return null;
    return {
      type: data.elements[0].tags?.highway ?? "unclassified",
      lat: center.lat,
      lng: center.lon,
    };
  } catch {
    return null;
  }
}

// ── Road by type filter ─────────────────────────────────────────────────────

export async function findRoadByType(
  lat: number,
  lng: number,
  filter: RoadFilter,
  radiusMeters = 3000
): Promise<{ type: string; lat: number; lng: number } | null> {
  let query: string;

  switch (filter) {
    case "paved":
      query = `
        [out:json][timeout:10];
        way(around:${radiusMeters},${lat},${lng})[highway~"^(tertiary|secondary|primary|residential)$"][surface~"^(paved|asphalt|concrete|tar)$"];
        out center 1;
      `;
      break;
    case "unpaved":
      query = `
        [out:json][timeout:10];
        (
          way(around:${radiusMeters},${lat},${lng})[highway~"^(track|unclassified)$"][surface~"^(unpaved|gravel|dirt|ground|earth|mud|sand|compacted)$"];
          way(around:${radiusMeters},${lat},${lng})[highway~"^(track|unclassified)$"][!surface];
        );
        out center 1;
      `;
      break;
    case "trekking":
      query = `
        [out:json][timeout:10];
        (
          way(around:${radiusMeters},${lat},${lng})[highway~"^(path|footway|bridleway)$"];
          relation(around:${radiusMeters},${lat},${lng})[route=hiking];
        );
        out center 1;
      `;
      break;
  }

  try {
    const data = (await queryOverpass(query)) as {
      elements: { center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
    };
    if (!data.elements?.length) return null;
    const el = data.elements[0];
    const center = el.center;
    if (!center) return null;
    return {
      type: el.tags?.highway ?? el.tags?.route ?? filter,
      lat: center.lat,
      lng: center.lon,
    };
  } catch {
    return null;
  }
}

// ── Terrain feature search ──────────────────────────────────────────────────

export async function findTerrainFeature(
  lat: number,
  lng: number,
  types: TerrainFilter[],
  radiusMeters = 5000
): Promise<{ terrain: string; lat: number; lng: number } | null> {
  const parts: string[] = [];

  for (const t of types) {
    switch (t) {
      case "hill":
        // Peaks, ridges, cliffs — typically elevated terrain
        parts.push(`node(around:${radiusMeters},${lat},${lng})[natural~"^(peak|ridge|cliff|volcano)$"];`);
        parts.push(`node(around:${radiusMeters},${lat},${lng})["ele"](if:number(t["ele"])>=60);`);
        break;
      case "forest":
        // Forest/wood landuse with significant area
        parts.push(`way(around:${radiusMeters},${lat},${lng})[natural=wood];`);
        parts.push(`way(around:${radiusMeters},${lat},${lng})[landuse=forest];`);
        break;
      case "lake":
        // Only actual lakes, reservoirs, ponds, dams — NOT canals/drains/streams
        parts.push(`way(around:${radiusMeters},${lat},${lng})[natural=water][water~"^(lake|reservoir|pond)$"];`);
        parts.push(`relation(around:${radiusMeters},${lat},${lng})[natural=water][water~"^(lake|reservoir|pond)$"];`);
        parts.push(`way(around:${radiusMeters},${lat},${lng})[waterway=dam];`);
        parts.push(`way(around:${radiusMeters},${lat},${lng})[landuse=reservoir];`);
        break;
      case "beach":
        // Beach and sandy areas
        parts.push(`way(around:${radiusMeters},${lat},${lng})[natural=beach];`);
        parts.push(`way(around:${radiusMeters},${lat},${lng})[natural=sand];`);
        parts.push(`node(around:${radiusMeters},${lat},${lng})[leisure=beach_resort];`);
        break;
      case "straight_road":
        // Long highway segments — we fetch and check length in post-processing
        parts.push(`way(around:${radiusMeters},${lat},${lng})[highway~"^(trunk|primary|secondary|tertiary|unclassified)$"];`);
        break;
    }
  }

  const query = `
    [out:json][timeout:12];
    (
      ${parts.join("\n      ")}
    );
    out center 5;
  `;

  try {
    const data = (await queryOverpass(query)) as {
      elements: {
        type: string;
        center?: { lat: number; lon: number };
        lat?: number;
        lon?: number;
        tags?: Record<string, string>;
      }[];
    };

    if (!data.elements?.length) return null;

    for (const el of data.elements) {
      const elLat = el.center?.lat ?? el.lat;
      const elLng = el.center?.lon ?? el.lon;
      if (!elLat || !elLng) continue;

      // Determine terrain label from tags
      const tags = el.tags ?? {};
      let terrain = "Open Land";

      if (tags.natural === "peak" || tags.natural === "ridge" || tags.natural === "cliff" || tags.ele) {
        terrain = "Hill Area";
      } else if (tags.natural === "wood" || tags.landuse === "forest") {
        terrain = "Forest";
      } else if (tags.natural === "water" || tags.waterway === "dam") {
        terrain = tags.water === "reservoir" ? "Reservoir/Dam" : tags.waterway === "dam" ? "Dam" : "Lake";
      } else if (tags.natural === "beach" || tags.natural === "sand" || tags.leisure === "beach_resort") {
        terrain = "Beach";
      } else if (tags.highway) {
        terrain = "Straight Road";
      }

      return { terrain, lat: elLat, lng: elLng };
    }

    return null;
  } catch {
    return null;
  }
}

// ── Check if area is residential/built-up ────────────────────────────────────

export async function isResidentialArea(
  lat: number,
  lng: number
): Promise<boolean> {
  const query = `
    [out:json][timeout:8];
    (
      way(around:300,${lat},${lng})[landuse~"^(residential|commercial|retail|industrial)$"];
      way(around:200,${lat},${lng})[building];
    );
    out count;
  `;

  try {
    const data = (await queryOverpass(query)) as {
      elements: { tags?: { total?: string } }[];
    };
    const count = Number(data.elements?.[0]?.tags?.total ?? 0);
    // If there are more than 5 buildings/residential ways within 200-300m, it's residential
    return count > 5;
  } catch {
    return false;
  }
}

// ── Count nearby POIs ────────────────────────────────────────────────────────

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

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data.elements?.[0]?.tags?.total ?? 0);
  } catch {
    return 0;
  }
}

// ── Derive terrain type ─────────────────────────────────────────────────────

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

  try {
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
  } catch {
    return "Unknown";
  }
}

// ── Nearby facilities (hospital, police, railway, bus stop) ─────────────────

export async function findNearbyFacilities(
  lat: number,
  lng: number,
  radiusMeters = 25000
): Promise<Facility[]> {
  // We run one combined query for all facility types
  const query = `
    [out:json][timeout:15];
    (
      node(around:${radiusMeters},${lat},${lng})[amenity=hospital];
      way(around:${radiusMeters},${lat},${lng})[amenity=hospital];
      node(around:${radiusMeters},${lat},${lng})[amenity=police];
      node(around:${radiusMeters},${lat},${lng})[railway=station];
      node(around:${radiusMeters},${lat},${lng})[highway=bus_stop];
    );
    out center 40;
  `;

  try {
    const data = (await queryOverpass(query)) as {
      elements: {
        type: string;
        center?: { lat: number; lon: number };
        lat?: number;
        lon?: number;
        tags?: Record<string, string>;
      }[];
    };

    if (!data.elements?.length) return [];

    // Group by type, pick closest of each
    const closest = new Map<string, Facility>();

    for (const el of data.elements) {
      const elLat = el.center?.lat ?? el.lat;
      const elLng = el.center?.lon ?? el.lon;
      if (!elLat || !elLng) continue;

      const tags = el.tags ?? {};
      let facilityType: Facility["type"] | null = null;

      if (tags.amenity === "hospital") facilityType = "hospital";
      else if (tags.amenity === "police") facilityType = "police";
      else if (tags.railway === "station") facilityType = "railway_station";
      else if (tags.highway === "bus_stop") facilityType = "bus_stop";

      if (!facilityType) continue;

      const dist = haversineKm(lat, lng, elLat, elLng);
      const existing = closest.get(facilityType);

      if (!existing || dist < existing.distanceKm) {
        closest.set(facilityType, {
          type: facilityType,
          name: tags.name || tags["name:en"] || facilityType.replace(/_/g, " "),
          lat: elLat,
          lng: elLng,
          distanceKm: parseFloat(dist.toFixed(1)),
        });
      }
    }

    return Array.from(closest.values());
  } catch {
    return [];
  }
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
