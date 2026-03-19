import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, getClientIp, errorResponse } from "@/lib/middleware";
import {
  getNearestRoadType,
  countNearbyPOIs,
  getTerrainType,
  BUSY_ROADS,
} from "@/lib/osm";

// Haversine distance in km
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

// Random point within radiusKm of center using uniform distribution
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

// Default search centers spread across India for variety
const DEFAULT_CENTERS = [
  { lat: 22.9734, lng: 78.6569 },  // central India
  { lat: 15.3173, lng: 75.7139 },  // Karnataka
  { lat: 27.0238, lng: 74.2179 },  // Rajasthan
  { lat: 25.0961, lng: 85.3131 },  // Bihar/Jharkhand hills
  { lat: 11.1271, lng: 78.6569 },  // Tamil Nadu
  { lat: 20.1809, lng: 83.9628 },  // Odisha
];

export async function GET(request: NextRequest) {
  try {
    // Auth
    let authPayload: Awaited<ReturnType<typeof requireAuth>>;
    try {
      authPayload = await requireAuth();
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    // Rate limit: 10 req / 60s per user
    const ip = getClientIp(request);
    const rl = checkRateLimit(`generate:${authPayload.userId}:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return errorResponse("Too many requests. Please wait a moment.", 429);
    }

    // Parse radius
    const rawRadius = request.nextUrl.searchParams.get("radius");
    const radiusKm = [20, 50, 100].includes(Number(rawRadius))
      ? Number(rawRadius)
      : 50;

    // Try up to 5 candidate locations
    const center =
      DEFAULT_CENTERS[Math.floor(Math.random() * DEFAULT_CENTERS.length)];

    let result = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomPointInCircle(center.lat, center.lng, radiusKm);

      const roadType = await getNearestRoadType(candidate.lat, candidate.lng, 300);

      // Skip if no road found or road is too busy
      if (roadType === "none") continue;
      if (BUSY_ROADS.has(roadType)) continue;

      const [poiCount, terrainType] = await Promise.all([
        countNearbyPOIs(candidate.lat, candidate.lng, 500),
        getTerrainType(candidate.lat, candidate.lng),
      ]);

      // Footfall score: 100 = completely hidden, 0 = very busy
      const footfallScore = Math.max(0, Math.min(100, 100 - poiCount * 5));

      const distanceKm = parseFloat(
        haversineKm(center.lat, center.lng, candidate.lat, candidate.lng).toFixed(1)
      );

      result = {
        coordinates: candidate,
        distanceKm,
        terrainType,
        footfallScore,
        roadType,
      };
      break;
    }

    if (!result) {
      // Fallback: return a random point even without road validation
      const fallback = randomPointInCircle(center.lat, center.lng, radiusKm);
      result = {
        coordinates: fallback,
        distanceKm: parseFloat(
          haversineKm(center.lat, center.lng, fallback.lat, fallback.lng).toFixed(1)
        ),
        terrainType: "Open Land",
        footfallScore: 80,
        roadType: "track",
      };
    }

    return Response.json(result);
  } catch (err) {
    console.error("[generate-location]", err);
    return errorResponse("Failed to generate location.", 500);
  }
}
