import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, getClientIp, errorResponse } from "@/lib/middleware";

const RENDER_API_URL =
  process.env.RENDER_API_URL ?? "http://localhost:8080";

export async function GET(request: NextRequest) {
  // Validate the user is authenticated (Next.js side)
  let authPayload: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authPayload = await requireAuth();
  } catch {
    return errorResponse("Unauthorized", 401);
  }

  // Rate-limit at the edge (10 req / 60 s per user)
  const ip = getClientIp(request);
  const rl = checkRateLimit(`generate:${authPayload.userId}:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return errorResponse("Too many requests. Please wait a moment.", 429);
  }

  // Build the upstream URL — forward all query params unchanged
  const upstream = new URL("/api/generate-location", RENDER_API_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  try {
    // Pass the original JWT as a Bearer token so Render can verify identity
    const cookieStore = await cookies();
    const token = cookieStore.get("ct_token")?.value ?? "";

    const res = await fetch(upstream.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[generate-location proxy] upstream:", upstream.toString(), "error:", err);
    return errorResponse("Location service is unavailable. Please try again in a moment.", 503);
  }
}
