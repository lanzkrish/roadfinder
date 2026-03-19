import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { errorResponse } from "@/lib/middleware";
import { connectDB } from "@/lib/db";
import { Location } from "@/models/Location";
import { User } from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    let auth: Awaited<ReturnType<typeof requireAuth>>;
    try {
      auth = await requireAuth();
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [locations, user] = await Promise.all([
      Location.find({ userId: auth.userId })
        .sort({ dateExplored: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.findById(auth.userId).select("totalExplored explorationStreak name email").lean(),
    ]);

    return Response.json({ locations, user, page });
  } catch (err) {
    console.error("[user/locations]", err);
    return errorResponse("Failed to fetch locations.", 500);
  }
}
