import { connectDB } from "@/lib/db";
import { signJWT, setAuthCookie } from "@/lib/auth";
import { hashEmail } from "@/lib/crypto";
import { sendWelcomeEmail } from "@/lib/mailer";
import { errorResponse } from "@/lib/middleware";
import { User } from "@/models/User";
import { OTP } from "@/models/OTP";
import bcrypt from "bcryptjs";
import { decrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body as { email?: string; otp?: string };

    if (!email || !otp) {
      return errorResponse("email and otp are required.", 400);
    }
    if (!/^\d{6}$/.test(otp)) {
      return errorResponse("OTP must be a 6-digit number.", 400);
    }

    await connectDB();

    const emailNorm = email.toLowerCase().trim();
    const eHash = hashEmail(emailNorm);

    // ── Find OTP record ─────────────────────────────────────────────────────
    const otpRecord = await OTP.findOne({ emailHash: eHash });
    if (!otpRecord) {
      return errorResponse("No verification code found. Please register again.", 400);
    }
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return errorResponse("Verification code has expired. Please register again.", 400);
    }

    const otpValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!otpValid) {
      return errorResponse("Invalid verification code.", 400);
    }

    // ── Mark user verified ──────────────────────────────────────────────────
    const user = await User.findOneAndUpdate(
      { emailHash: eHash },
      { isVerified: true },
      { new: true }
    );
    if (!user) {
      return errorResponse("User not found. Please register again.", 400);
    }

    // ── Clean up OTP ────────────────────────────────────────────────────────
    await OTP.deleteOne({ _id: otpRecord._id });

    // ── Issue JWT cookie ────────────────────────────────────────────────────
    const token = signJWT({ userId: String(user._id), email: emailNorm });
    await setAuthCookie(token);

    // ── Send welcome email (non-blocking) ───────────────────────────────────
    sendWelcomeEmail(decrypt(user.emailEncrypted), user.name).catch((e) =>
      console.warn("[welcome-email]", e)
    );

    return Response.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: emailNorm,
        totalExplored: user.totalExplored,
        explorationStreak: user.explorationStreak,
      },
    });
  } catch (err) {
    console.error("[verify-otp]", err);
    return errorResponse("An unexpected error occurred.", 500);
  }
}
