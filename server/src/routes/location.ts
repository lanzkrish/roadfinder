import { Router, Response } from "express";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import { requireAuth, AuthRequest } from "../lib/auth";
import { User, Location } from "../models";

const router = Router();

// ── Overpass API helper ───────────────────────────────────────────────────────

async function queryOverpass(query: string): Promise<unknown> {
  const url = process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error("Overpass API error");
  return res.json();
}

async function getTerrainType(lat: number, lng: number): Promise<string> {
  const r = 500;
  const query = `[out:json][timeout:8];(way["natural"](around:${r},${lat},${lng});way["landuse"](around:${r},${lat},${lng}););out tags;`;
  try {
    const data = (await queryOverpass(query)) as { elements: { tags?: Record<string, string> }[] };
    const el = data.elements[0]?.tags;
    if (!el) return "countryside";
    if (el.natural === "forest" || el.landuse === "forest") return "forest";
    if (el.natural === "water" || el.natural === "wetland") return "waterside";
    if (el.natural === "mountain" || el.natural === "peak") return "mountain";
    if (el.landuse === "farmland" || el.landuse === "meadow") return "farmland";
    return "countryside";
  } catch { return "countryside"; }
}

async function countNearbyPOIs(lat: number, lng: number): Promise<number> {
  const r = 2000;
  const query = `[out:json][timeout:8];(node["amenity"](around:${r},${lat},${lng});node["shop"](around:${r},${lat},${lng});node["tourism"](around:${r},${lat},${lng}););out count;`;
  try {
    const data = (await queryOverpass(query)) as { elements: { tags?: { total?: string } }[] };
    return Number(data.elements[0]?.tags?.total ?? 0);
  } catch { return 0; }
}

// Generate random lat/lng within radius (km) from origin
function randomCoordInRadius(lat: number, lng: number, radiusKm: number) {
  const earthR = 6371;
  const r = radiusKm / earthR;
  const u = Math.random(), v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const dLat = w * Math.cos(t) * (180 / Math.PI);
  const dLng = (w * Math.sin(t) * (180 / Math.PI)) / Math.cos(lat * (Math.PI / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

async function getScenicRoadNear(lat: number, lng: number, radiusMeters = 3000): Promise<{ type: string; lat: number; lng: number } | null> {
  const query = `
    [out:json][timeout:10];
    way(around:${radiusMeters},${lat},${lng})[highway~"^(unclassified|track|path|tertiary|dirt|bridleway)$"];
    out center 1;
  `;
  try {
    const data = (await queryOverpass(query)) as { elements: { center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
    if (!data.elements || data.elements.length === 0) return null;
    const center = data.elements[0].center;
    if (!center) return null;
    return { type: data.elements[0].tags?.highway ?? "unclassified", lat: center.lat, lng: center.lon };
  } catch {
    return null;
  }
}

const genLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: "Rate limit: maximum 10 route generations per minute." },
});

// ── GET /api/generate-location ────────────────────────────────────────────────
router.get("/generate-location", requireAuth, genLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const radiusKm = Math.min(Number(req.query.radius ?? 50), 200);
    const originLat = Number(req.query.lat ?? 20.5937); // default: India
    const originLng = Number(req.query.lng ?? 78.9629);

    const MAX_TRIES = 8;
    for (let i = 0; i < MAX_TRIES; i++) {
      const point = randomCoordInRadius(originLat, originLng, radiusKm);
      const scenicRoad = await getScenicRoadNear(point.lat, point.lng, 3000);
      
      if (!scenicRoad) continue;

      const { lat, lng, type: roadType } = scenicRoad;

      const pois = await countNearbyPOIs(lat, lng);
      if (pois > 80) continue; // too busy

      const terrain = await getTerrainType(lat, lng);
      const footfallScore = Math.max(0, Math.min(100, 100 - pois * 4));
      
      // Haversine approximation
      const earthR = 6371;
      const dLat = (lat - originLat) * Math.PI / 180;
      const dLng = (lng - originLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) ** 2 + Math.cos(originLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng/2) ** 2;
      const distKm = earthR * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      res.json({
        coordinates: { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) },
        distanceKm: Number(distKm.toFixed(1)),
        terrainType: terrain,
        footfallScore,
        roadType,
      });
      return;
    }
    
    // Fallback if no true scenic road found
    const fallback = randomCoordInRadius(originLat, originLng, radiusKm);
    const fallbackDist = Math.sqrt(Math.pow(fallback.lat - originLat, 2) + Math.pow(fallback.lng - originLng, 2)) * 111;
    res.json({
      coordinates: { lat: Number(fallback.lat.toFixed(6)), lng: Number(fallback.lng.toFixed(6)) },
      distanceKm: Number(fallbackDist.toFixed(1)),
      terrainType: "Open Land",
      footfallScore: 80,
      roadType: "track",
    });
  } catch (err) {
    console.error("[generate-location]", err);
    res.status(500).json({ error: "Failed to generate location." });
  }
});

// ── POST /api/save-location ───────────────────────────────────────────────────
router.post("/save-location", requireAuth, async (req: AuthRequest, res: Response) => {
  const { lat, lng, distanceKm, terrainType, footfallScore, notes, imageUrl, dateExplored } = req.body ?? {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "lat and lng are required numbers." }); return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "Invalid coordinates." }); return;
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

export default router;
