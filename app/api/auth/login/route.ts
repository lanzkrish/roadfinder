import { connectDB } from "@/lib/db";
import { verifyPassword, signJWT, setAuthCookie } from "@/lib/auth";
import { hashEmail, decrypt } from "@/lib/crypto";
import { errorResponse } from "@/lib/middleware";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return errorResponse("email and password are required.", 400);
    }

    await connectDB();

    const emailNorm = email.toLowerCase().trim();
    const eHash = hashEmail(emailNorm);

    // Lookup by hash — no decryption needed for the query
    const user = await User.findOne({ emailHash: eHash });
    if (!user) {
      return errorResponse("Invalid email or password.", 401);
    }

    if (!user.isVerified) {
      return errorResponse(
        "Please verify your email before logging in. Check your inbox for the verification code.",
        403
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return errorResponse("Invalid email or password.", 401);
    }

    // Decrypt email for the JWT payload
    const plainEmail = decrypt(user.emailEncrypted);

    const token = signJWT({ userId: String(user._id), email: plainEmail });
    await setAuthCookie(token);

    return Response.json({
      user: {
        id: String(user._id),
        email: plainEmail,
        name: user.name,
        totalExplored: user.totalExplored,
        explorationStreak: user.explorationStreak,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return errorResponse("An unexpected error occurred.", 500);
  }
}
