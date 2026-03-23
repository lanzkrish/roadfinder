import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { errorResponse } from "@/lib/middleware";

/**
 * GET /api/token
 * Returns the current user's JWT so the browser can make
 * authenticated requests directly to the Render backend.
 */
export async function GET() {
  try {
    await requireAuth();
  } catch {
    return errorResponse("Unauthorized", 401);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ct_token")?.value ?? "";

  return Response.json({ token });
}
