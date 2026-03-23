import { Router, Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth, AuthRequest, verifyJWT } from "../lib/auth";
import { User, Location } from "../models";

const router = Router();

// ── Overpass API ──────────────────────────────────────────────────────────────

const OVERPASS_URL =
  process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";

async function queryOverpass(query: string): Promise<unknown> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export type TerrainFilter = "hill" | "forest" | "lake" | "beach" | "straight_road";
export type RoadFilter = "paved" | "unpaved" | "trekking";

function randomPointInCircle(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): { lat: number; lng: number } {
  const r = radiusKm * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const dLat = (r * Math.cos(theta)) / 111.32;
  const dLng =
    (r * Math.sin(theta)) / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  return {
    lat: parseFloat((centerLat + dLat).toFixed(6)),
    lng: parseFloat((centerLng + dLng).toFixed(6)),
  };
}

function haversineKm(
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

async function getScenicRoadNear(
  lat: number,
  lng: number,
  radiusMeters = 3000
): Promise<{ type: string; lat: number; lng: number } | null> {
  const query = `
    [out:json][timeout:6];
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
  } catch { return null; }
}

async function findRoadByType(
  lat: number,
  lng: number,
  filter: RoadFilter,
  radiusMeters = 3000
): Promise<{ type: string; lat: number; lng: number } | null> {
  let query: string;
  switch (filter) {
    case "paved":
      query = `[out:json][timeout:6];way(around:${radiusMeters},${lat},${lng})[highway~"^(tertiary|secondary|primary|residential)$"][surface~"^(paved|asphalt|concrete|tar)$"];out center 1;`;
      break;
    case "unpaved":
      query = `[out:json][timeout:6];(way(around:${radiusMeters},${lat},${lng})[highway~"^(track|unclassified)$"][surface~"^(unpaved|gravel|dirt|ground|earth|mud|sand|compacted)$"];way(around:${radiusMeters},${lat},${lng})[highway~"^(track|unclassified)$"][!surface];);out center 1;`;
      break;
    case "trekking":
      query = `[out:json][timeout:6];(way(around:${radiusMeters},${lat},${lng})[highway~"^(path|footway|bridleway)$"];relation(around:${radiusMeters},${lat},${lng})[route=hiking];);out center 1;`;
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
  } catch { return null; }
}

async function findTerrainFeature(
  lat: number,
  lng: number,
  types: TerrainFilter[],
  radiusMeters = 5000
): Promise<{ terrain: string; lat: number; lng: number } | null> {
  const parts: string[] = [];
  for (const t of types) {
    switch (t) {
      case "hill":
        parts.push(`node(around:${radiusMeters},${lat},${lng})[natural~"^(peak|ridge|cliff|volcano)$"];`);
        parts.push(`node(around:${radiusMeters},${lat},${lng})["ele"](if:number(t["ele"])>=60);`);
        break;
      case "forest":
        parts.push(`way(around:${radiusMeters},${lat},${lng})[natural=wood];`);
        parts.push(`way(around:${radiusMeters},${lat},${lng})[landuse=forest];`);
        break;
      case "lake":
        parts.push(`way(around:${radiusMeters},${lat},${lng})[natural=water][water~"^(lake|reservoir|pond)$"];`);
        parts.push(`relation(around:${radiusMeters},${lat},${lng})[natural=water][water~"^(lake|reservoir|pond)$"];`);
        parts.push(`way(around:${radiusMeters},${lat},${lng})[waterway=dam];`);
        parts.push(`way(around:${radiusMeters},${lat},${lng})[landuse=reservoir];`);
        break;
      case "beach":
        parts.push(`way(around:${radiusMeters},${lat},${lng})[natural=beach];`);
        parts.push(`way(around:${radiusMeters},${lat},${lng})[natural=sand];`);
        parts.push(`node(around:${radiusMeters},${lat},${lng})[leisure=beach_resort];`);
        break;
      case "straight_road":
        parts.push(`way(around:${radiusMeters},${lat},${lng})[highway~"^(trunk|primary|secondary|tertiary|unclassified)$"];`);
        break;
    }
  }
  const query = `[out:json][timeout:8];(\n${parts.join("\n")}\n);out center 5;`;
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
      const tags = el.tags ?? {};
      let terrain = "Open Land";
      if (tags.natural === "peak" || tags.natural === "ridge" || tags.natural === "cliff" || tags.ele) terrain = "Hill Area";
      else if (tags.natural === "wood" || tags.landuse === "forest") terrain = "Forest";
      else if (tags.natural === "water" || tags.waterway === "dam") terrain = tags.water === "reservoir" ? "Reservoir/Dam" : tags.waterway === "dam" ? "Dam" : "Lake";
      else if (tags.natural === "beach" || tags.natural === "sand" || tags.leisure === "beach_resort") terrain = "Beach";
      else if (tags.highway) terrain = "Straight Road";
      return { terrain, lat: elLat, lng: elLng };
    }
    return null;
  } catch { return null; }
}

async function isResidentialArea(lat: number, lng: number): Promise<boolean> {
  const query = `
    [out:json][timeout:6];
    (
      way(around:400,${lat},${lng})[landuse~"^(residential|commercial|retail|industrial)$"];
      way(around:400,${lat},${lng})[building];
      node(around:1000,${lat},${lng})[place~"^(city|town|suburb|borough|quarter|neighbourhood)$"];
    );
    out count;
  `;
  try {
    const data = (await queryOverpass(query)) as {
      elements: { tags?: { total?: string } }[];
    };
    return Number(data.elements?.[0]?.tags?.total ?? 0) > 2;
  } catch { return false; }
}

async function countNearbyPOIs(lat: number, lng: number, radiusMeters = 2000): Promise<number> {
  const query = `[out:json][timeout:6];(node(around:${radiusMeters},${lat},${lng})[amenity];node(around:${radiusMeters},${lat},${lng})[tourism];node(around:${radiusMeters},${lat},${lng})[shop];);out count;`;
  try {
    const data = (await queryOverpass(query)) as {
      elements: { tags?: { total?: string } }[];
    };
    return Number(data.elements?.[0]?.tags?.total ?? 0);
  } catch { return 0; }
}

async function getTerrainType(lat: number, lng: number): Promise<string> {
  const query = `[out:json][timeout:6];(way(around:300,${lat},${lng})[natural];way(around:300,${lat},${lng})[landuse];);out tags 1;`;
  try {
    const data = (await queryOverpass(query)) as {
      elements: { tags?: Record<string, string> }[];
    };
    const tags = data.elements?.[0]?.tags;
    if (!tags) return "Open Land";
    const map: Record<string, string> = {
      forest: "Forest", wood: "Forest", grassland: "Grassland", heath: "Heathland",
      scrub: "Scrubland", water: "Waterside", wetland: "Wetland", beach: "Beach",
      cliff: "Cliff", meadow: "Meadow", farmland: "Farmland", residential: "Rural Settlement",
    };
    return map[tags.natural ?? ""] ?? map[tags.landuse ?? ""] ?? "Open Land";
  } catch { return "Open Land"; }
}

async function getElevation(lat: number, lng: number): Promise<number | null> {
  try {
    const query = `[out:json][timeout:6];node(around:500,${lat},${lng})["ele"];out 1;`;
    const data = (await queryOverpass(query)) as {
      elements: { tags?: { ele?: string } }[];
    };
    if (data.elements?.[0]?.tags?.ele) {
      return Math.round(parseFloat(data.elements[0].tags.ele));
    }
    const res = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`,
      { signal: AbortSignal.timeout(6_000) }
    );
    if (res.ok) {
      const json = await res.json();
      const elev = json.results?.[0]?.elevation;
      if (typeof elev === "number") return Math.round(elev);
    }
    return null;
  } catch { return null; }
}

// ── Auth middleware that accepts Bearer token from Next.js proxy ───────────────

export function requireAuthOrBearer(req: AuthRequest, res: Response, next: NextFunction): void {
  // 1. Try Bearer token (forwarded from Next.js proxy)
  const auth = req.headers["authorization"];
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = verifyJWT(auth.slice(7)) as { userId: string; email: string };
      req.userId = payload.userId;
      req.userEmail = payload.email;
      return next();
    } catch {
      res.status(401).json({ error: "Invalid token." });
      return;
    }
  }
  // 2. Fallback: cookie-based auth (direct API calls)
  requireAuth(req, res, next);
}

// ── Rate limiters ─────────────────────────────────────────────────────────────

const genLimiter = rateLimit({
  windowMs: 60_000, max: 10,
  message: { error: "Rate limit: maximum 10 route generations per minute." },
});

// ── Default search centers (India) ────────────────────────────────────────────

const DEFAULT_CENTERS = [
  { lat: 22.9734, lng: 78.6569 },
  { lat: 15.3173, lng: 75.7139 },
  { lat: 27.0238, lng: 74.2179 },
  { lat: 25.0961, lng: 85.3131 },
  { lat: 11.1271, lng: 78.6569 },
  { lat: 20.1809, lng: 83.9628 },
];

const VALID_TERRAINS = new Set(["hill", "forest", "lake", "beach", "straight_road"]);
const VALID_ROADS = new Set(["paved", "unpaved", "trekking"]);

// ── GET /api/generate-location ────────────────────────────────────────────────

router.get(
  "/generate-location",
  requireAuthOrBearer,
  genLimiter,
  async (req: AuthRequest, res: Response) => {
    const deadline = Date.now() + 55_000; // Render has no timeout; give 55s before giving up

    try {
      const rawRadius = String(req.query.radius ?? "50");
      const radiusKm = [20, 50, 100].includes(Number(rawRadius)) ? Number(rawRadius) : 50;

      const latParam = req.query.lat ? Number(req.query.lat) : null;
      const lngParam = req.query.lng ? Number(req.query.lng) : null;

      const terrainParam = String(req.query.terrain ?? "");
      const terrainFilters = terrainParam
        .split(",")
        .filter((t) => VALID_TERRAINS.has(t)) as TerrainFilter[];

      const roadParam = String(req.query.road ?? "");
      const roadFilter: RoadFilter | null = VALID_ROADS.has(roadParam)
        ? (roadParam as RoadFilter)
        : null;

      const center =
        latParam !== null && lngParam !== null
          ? { lat: latParam, lng: lngParam }
          : DEFAULT_CENTERS[Math.floor(Math.random() * DEFAULT_CENTERS.length)];

      const hasTerrainFilter = terrainFilters.length > 0;
      let result = null;

      for (let attempt = 0; attempt < 8 && Date.now() < deadline; attempt++) {
        let candidate = randomPointInCircle(center.lat, center.lng, radiusKm);

        // Terrain filter
        if (hasTerrainFilter) {
          const hit = await findTerrainFeature(candidate.lat, candidate.lng, terrainFilters, 5000);
          if (!hit) continue;
          candidate = { lat: hit.lat, lng: hit.lng };
        }

        // Road + residential check in parallel
        const [roadResult, residential] = await Promise.all([
          roadFilter
            ? findRoadByType(candidate.lat, candidate.lng, roadFilter, 3000)
            : getScenicRoadNear(candidate.lat, candidate.lng, 3000),
          isResidentialArea(candidate.lat, candidate.lng),
        ]);

        if (!roadResult || residential) continue;

        const roadType = roadResult.type;
        if (!hasTerrainFilter) {
          candidate = { lat: roadResult.lat, lng: roadResult.lng };
        }

        // Score in parallel
        const [poiCount, terrainType, altitude] = await Promise.all([
          countNearbyPOIs(candidate.lat, candidate.lng, 2000),
          hasTerrainFilter ? Promise.resolve(null) : getTerrainType(candidate.lat, candidate.lng),
          getElevation(candidate.lat, candidate.lng),
        ]);

        const carpeTerraScore = Math.max(0, Math.min(100, 100 - poiCount * 4));
        if (hasTerrainFilter && carpeTerraScore < 40) continue;

        const distanceKm = parseFloat(
          haversineKm(center.lat, center.lng, candidate.lat, candidate.lng).toFixed(1)
        );

        const terrainLabels: Record<TerrainFilter, string> = {
          hill: "Hill Area", forest: "Forest", lake: "Lake/Dam", beach: "Beach", straight_road: "Straight Road",
        };
        const finalTerrain = hasTerrainFilter
          ? terrainFilters.map((t) => terrainLabels[t]).join(", ")
          : (terrainType ?? "Open Land");

        result = {
          coordinates: candidate,
          distanceKm,
          terrainType: finalTerrain,
          carpeTerraScore,
          footfallScore: carpeTerraScore, // backward compat
          roadType,
          isRemote: carpeTerraScore >= 80,
          altitude,
        };

        if (carpeTerraScore >= 60) break;
      }

      if (!result) {
        res.status(404).json({
          error:
            "No suitable location found in this area. Try selecting a larger search radius or removing terrain/road filters — dense or flat regions may have fewer hidden spots.",
        });
        return;
      }

      res.json(result);
    } catch (err) {
      console.error("[generate-location]", err);
      res.status(500).json({ error: "Failed to generate location." });
    }
  }
);

// ── POST /api/save-location ───────────────────────────────────────────────────

router.post("/save-location", requireAuthOrBearer, async (req: AuthRequest, res: Response) => {
  const { lat, lng, distanceKm, terrainType, footfallScore, notes, imageUrl, dateExplored } =
    req.body ?? {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "lat and lng are required numbers." });
    return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "Invalid coordinates." });
    return;
  }

  try {
    const location = await Location.create({
      userId: req.userId,
      coordinates: { lat, lng },
      distanceKm: Number(distanceKm ?? 0),
      terrainType: terrainType ?? "unknown",
      footfallScore: Number(footfallScore ?? 50),
      notes: notes?.slice(0, 2000),
      imageUrl,
      dateExplored: dateExplored ? new Date(dateExplored) : new Date(),
    });

    await User.findByIdAndUpdate(req.userId, { $inc: { totalExplored: 1 } });

    res.json({ location, message: "Location saved!" });
  } catch (err) {
    console.error("[save-location]", err);
    res.status(500).json({ error: "Failed to save location." });
  }
});

// ── GET /api/locations (saved locations list) ─────────────────────────────────

router.get("/locations", requireAuthOrBearer, async (req: AuthRequest, res: Response) => {
  try {
    const locations = await Location.find({ userId: req.userId })
      .sort({ dateExplored: -1 })
      .limit(100);
    res.json({ locations });
  } catch (err) {
    console.error("[locations]", err);
    res.status(500).json({ error: "Failed to fetch locations." });
  }
});

export default router;
