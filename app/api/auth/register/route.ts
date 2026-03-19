import { connectDB } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { encrypt, hashEmail } from "@/lib/crypto";
import { sendVerificationEmail } from "@/lib/mailer";
import { errorResponse } from "@/lib/middleware";
import { User } from "@/models/User";
import { OTP } from "@/models/OTP";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    // ── Validation ──────────────────────────────────────────────────────────
    if (!email || !password || !name) {
      return errorResponse("email, password, and name are required.", 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return errorResponse("Invalid email format.", 400);
    }
    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters.", 400);
    }
    if (name.trim().length < 2) {
      return errorResponse("Name must be at least 2 characters.", 400);
    }

    await connectDB();

    const emailNorm = email.toLowerCase().trim();
    const eHash = hashEmail(emailNorm);

    // ── Check duplicate ─────────────────────────────────────────────────────
    const exists = await User.findOne({ emailHash: eHash });
    if (exists) {
      return errorResponse("An account with this email already exists.", 409);
    }

    // ── Store pending user (unverified) ──────────────────────────────────────
    const passwordHash = await hashPassword(password);
    const emailEncrypted = encrypt(emailNorm);

    // Upsert: allow re-register if previously unverified
    await User.findOneAndUpdate(
      { emailHash: eHash },
      {
        emailHash: eHash,
        emailEncrypted,
        passwordHash,
        name: name.trim(),
        isVerified: false,
      },
      { upsert: true, new: true }
    );

    // ── Generate & store OTP ────────────────────────────────────────────────
    const otp = crypto.randomInt(100000, 999999).toString(); // 6 digits
    const otpHash = await bcrypt.hash(otp, 4); // 4 rounds — OTPs are short-lived
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Remove any old OTPs for this email
    await OTP.deleteMany({ emailHash: eHash });
    await OTP.create({ emailHash: eHash, otpHash, expiresAt });

    // ── Send email ──────────────────────────────────────────────────────────
    await sendVerificationEmail(emailNorm, otp);

    return Response.json(
      { needsVerification: true, message: "Verification code sent to your email." },
      { status: 200 }
    );
  } catch (err) {
    console.error("[register]", err);
    return errorResponse("An unexpected error occurred.", 500);
  }
}
