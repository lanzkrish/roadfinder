import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { errorResponse } from "@/lib/middleware";
import { findNearbyFacilities } from "@/lib/osm";

export async function GET(request: NextRequest) {
  try {
    try {
      await requireAuth();
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    const lat = Number(request.nextUrl.searchParams.get("lat"));
    const lng = Number(request.nextUrl.searchParams.get("lng"));

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse("Invalid coordinates.", 400);
    }

    const facilities = await findNearbyFacilities(lat, lng, 25000);

    return Response.json({ facilities });
  } catch (err) {
    console.error("[nearby-facilities]", err);
    return errorResponse("Failed to fetch nearby facilities.", 500);
  }
}
