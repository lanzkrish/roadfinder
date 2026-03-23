import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, getClientIp, errorResponse } from "@/lib/middleware";
import {
  getScenicRoadNear,
  findRoadByType,
  findTerrainFeature,
  countNearbyPOIs,
  getTerrainType,
  getElevation,
  isResidentialArea,
  haversineKm,
  type TerrainFilter,
  type RoadFilter,
} from "@/lib/osm";

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

const VALID_TERRAINS = new Set(["hill", "forest", "lake", "beach", "straight_road"]);
const VALID_ROADS = new Set(["paved", "unpaved", "trekking"]);

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

    const latParam = request.nextUrl.searchParams.get("lat");
    const lngParam = request.nextUrl.searchParams.get("lng");

    // Parse terrain filters (comma-separated)
    const terrainParam = request.nextUrl.searchParams.get("terrain") ?? "";
    const terrainFilters: TerrainFilter[] = terrainParam
      .split(",")
      .filter((t) => VALID_TERRAINS.has(t)) as TerrainFilter[];

    // Parse road filter
    const roadParam = request.nextUrl.searchParams.get("road") ?? "";
    const roadFilter: RoadFilter | null = VALID_ROADS.has(roadParam)
      ? (roadParam as RoadFilter)
      : null;

    // Use user's real location if provided, otherwise fallback to random Indian location
    const center = latParam && lngParam
      ? { lat: Number(latParam), lng: Number(lngParam) }
      : DEFAULT_CENTERS[Math.floor(Math.random() * DEFAULT_CENTERS.length)];

    let result = null;
    const hasTerrainFilter = terrainFilters.length > 0;

    for (let attempt = 0; attempt < 10; attempt++) {
      let candidate = randomPointInCircle(center.lat, center.lng, radiusKm);

      // ── Terrain filter: find a matching terrain feature near the candidate ──
      // Keep terrainLocation separate so the road snap doesn't move us away
      let terrainLocation: { lat: number; lng: number } | null = null;

      if (hasTerrainFilter) {
        const terrainHit = await findTerrainFeature(
          candidate.lat,
          candidate.lng,
          terrainFilters,
          5000
        );
        if (!terrainHit) continue; // No matching terrain near this random point
        terrainLocation = { lat: terrainHit.lat, lng: terrainHit.lng };
        candidate = { ...terrainLocation };
      }

      // ── Road filter: find matching road type near the candidate ──
      let roadType: string;
      if (roadFilter) {
        const road = await findRoadByType(candidate.lat, candidate.lng, roadFilter, 3000);
        if (!road) continue;
        roadType = road.type;
        // Only snap to road if no terrain filter, otherwise keep terrain position
        if (!hasTerrainFilter) {
          candidate = { lat: road.lat, lng: road.lng };
        }
      } else {
        const scenicRoad = await getScenicRoadNear(candidate.lat, candidate.lng, 3000);
        if (!scenicRoad) continue;
        roadType = scenicRoad.type;
        if (!hasTerrainFilter) {
          candidate = { lat: scenicRoad.lat, lng: scenicRoad.lng };
        }
      }

      // ── Reject residential/built-up areas ──
      const residential = await isResidentialArea(candidate.lat, candidate.lng);
      if (residential) continue; // Skip — too many houses/buildings

      // ── Compute POI count and terrain ──
      const [poiCount, terrainType, altitude] = await Promise.all([
        countNearbyPOIs(candidate.lat, candidate.lng, 2000),
        hasTerrainFilter ? Promise.resolve(null) : getTerrainType(candidate.lat, candidate.lng),
        getElevation(candidate.lat, candidate.lng),
      ]);

      // Carpe Terra score: 100 = completely hidden, 0 = very busy
      const carpeTerraScore = Math.max(0, Math.min(100, 100 - poiCount * 4));
      const isRemote = carpeTerraScore >= 80;

      // When terrain filter is active, require a minimum quality
      if (hasTerrainFilter && carpeTerraScore < 40) continue;

      const distanceKm = parseFloat(
        haversineKm(center.lat, center.lng, candidate.lat, candidate.lng).toFixed(1)
      );

      // If terrain filter was used, use the terrain from the filter hit
      const finalTerrainType = hasTerrainFilter
        ? terrainFilters.map((t) => {
            const labels: Record<TerrainFilter, string> = {
              hill: "Hill Area",
              forest: "Forest",
              lake: "Lake/Dam",
              beach: "Beach",
              straight_road: "Straight Road",
            };
            return labels[t];
          }).join(", ")
        : (terrainType ?? "Open Land");

      result = {
        coordinates: candidate,
        distanceKm,
        terrainType: finalTerrainType,
        carpeTerraScore,
        roadType,
        isRemote,
        altitude,
      };

      // If we found a genuinely good hidden spot, stop searching
      if (carpeTerraScore >= 60) break;
    }

    if (!result) {
      // Fallback: return a random point even without road validation
      const fallback = randomPointInCircle(center.lat, center.lng, radiusKm);
      const [fallbackAlt] = await Promise.all([getElevation(fallback.lat, fallback.lng)]);
      result = {
        coordinates: fallback,
        distanceKm: parseFloat(
          haversineKm(center.lat, center.lng, fallback.lat, fallback.lng).toFixed(1)
        ),
        terrainType: "Open Land",
        carpeTerraScore: 80,
        roadType: "track",
        isRemote: true,
        altitude: fallbackAlt,
      };
    }

    return Response.json(result);
  } catch (err) {
    console.error("[generate-location]", err);
    return errorResponse("Failed to generate location.", 500);
  }
}
