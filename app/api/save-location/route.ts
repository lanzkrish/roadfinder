import { requireAuth } from "@/lib/auth";
import { errorResponse } from "@/lib/middleware";
import { connectDB } from "@/lib/db";
import { Location } from "@/models/Location";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    let auth: Awaited<ReturnType<typeof requireAuth>>;
    try {
      auth = await requireAuth();
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const { lat, lng, notes, imageUrl, dateExplored, terrainType, footfallScore, distanceKm } =
      body as {
        lat?: number;
        lng?: number;
        notes?: string;
        imageUrl?: string;
        dateExplored?: string;
        terrainType?: string;
        footfallScore?: number;
        distanceKm?: number;
      };

    if (typeof lat !== "number" || typeof lng !== "number") {
      return errorResponse("lat and lng are required numbers.", 400);
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse("Coordinates out of range.", 400);
    }
    if (notes && notes.length > 2000) {
      return errorResponse("Notes too long (max 2000 chars).", 400);
    }

    await connectDB();

    const location = await Location.create({
      userId: auth.userId,
      coordinates: { lat, lng },
      notes: notes?.trim() ?? "",
      imageUrl: imageUrl ?? "",
      dateExplored: dateExplored ? new Date(dateExplored) : new Date(),
      terrainType: terrainType ?? "Open Land",
      footfallScore: footfallScore ?? 50,
      distanceKm: distanceKm ?? 0,
    });

    // Update user stats
    await User.findByIdAndUpdate(auth.userId, {
      $inc: { totalExplored: 1 },
      $set: { lastExplored: new Date() },
    });

    return Response.json({ location }, { status: 201 });
  } catch (err) {
    console.error("[save-location]", err);
    return errorResponse("Failed to save location.", 500);
  }
}
