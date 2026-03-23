import { errorResponse } from "@/lib/middleware";

const RENDER_API_URL =
  process.env.RENDER_API_URL ?? "http://localhost:8080";

/**
 * GET /api/warmup
 * Pings the Render backend health endpoint to prevent cold-start delays.
 * Called silently when the user opens the Explore page.
 */
export async function GET() {
  try {
    await fetch(`${RENDER_API_URL}/api/health`, {
      signal: AbortSignal.timeout(8_000),
    });
    return Response.json({ ok: true });
  } catch {
    // Silently fail — this is a best-effort warm-up ping
    return Response.json({ ok: false });
  }
}
