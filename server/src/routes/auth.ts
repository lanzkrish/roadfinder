import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import {
  hashPassword, verifyPassword, signJWT, setAuthCookie, clearAuthCookie, requireAuth
} from "../lib/auth";
import { encrypt, hashEmail, decrypt } from "../lib/crypto";
import { sendVerificationEmail, sendWelcomeEmail } from "../lib/mailer";
import { User, OTP } from "../models";

const router = Router();

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", authLimiter, async (req: Request, res: Response) => {
  const { email, password, name } = req.body ?? {};

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required." });
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: "Invalid email format." });
    return;
  }
  if (String(password).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  try {
    const emailNorm = String(email).toLowerCase().trim();
    const eHash = hashEmail(emailNorm);

    const exists = await User.findOne({ emailHash: eHash, isVerified: true });
    if (exists) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const [passwordHash, emailEncrypted] = await Promise.all([
      hashPassword(String(password)),
      Promise.resolve(encrypt(emailNorm)),
    ]);

    await User.findOneAndUpdate(
      { emailHash: eHash },
      { emailHash: eHash, emailEncrypted, passwordHash, name: String(name).trim(), isVerified: false },
      { upsert: true }
    );

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 4);
    await OTP.deleteMany({ emailHash: eHash });
    await OTP.create({ emailHash: eHash, otpHash, expiresAt: new Date(Date.now() + 10 * 60_000) });

    await sendVerificationEmail(emailNorm, otp);

    res.json({ needsVerification: true, message: "Verification code sent to your email." });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
router.post("/verify-otp", authLimiter, async (req: Request, res: Response) => {
  const { email, otp } = req.body ?? {};
  if (!email || !otp) { res.status(400).json({ error: "email and otp are required." }); return; }
  if (!/^\d{6}$/.test(String(otp))) { res.status(400).json({ error: "OTP must be 6 digits." }); return; }

  try {
    const eHash = hashEmail(String(email).toLowerCase().trim());
    const otpRecord = await OTP.findOne({ emailHash: eHash });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ emailHash: eHash });
      res.status(400).json({ error: "Code expired or not found. Please register again." });
      return;
    }
    const valid = await bcrypt.compare(String(otp), otpRecord.otpHash);
    if (!valid) { res.status(400).json({ error: "Invalid verification code." }); return; }

    const user = await User.findOneAndUpdate({ emailHash: eHash }, { isVerified: true }, { new: true });
    if (!user) { res.status(400).json({ error: "User not found." }); return; }

    await OTP.deleteOne({ _id: otpRecord._id });

    const plainEmail = decrypt(user.emailEncrypted);
    const token = signJWT({ userId: String(user._id), email: plainEmail });
    setAuthCookie(res, token);

    sendWelcomeEmail(plainEmail, user.name).catch((e) => console.warn("[welcome]", e));

    res.json({ user: { id: String(user._id), name: user.name, email: plainEmail, totalExplored: user.totalExplored, explorationStreak: user.explorationStreak } });
  } catch (err) {
    console.error("[verify-otp]", err);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) { res.status(400).json({ error: "email and password are required." }); return; }

  try {
    const eHash = hashEmail(String(email).toLowerCase().trim());
    const user = await User.findOne({ emailHash: eHash });
    if (!user) { res.status(401).json({ error: "Invalid email or password." }); return; }
    if (!user.isVerified) { res.status(403).json({ error: "Please verify your email before logging in." }); return; }

    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid email or password." }); return; }

    const plainEmail = decrypt(user.emailEncrypted);
    const token = signJWT({ userId: String(user._id), email: plainEmail });
    setAuthCookie(res, token);

    res.json({ user: { id: String(user._id), name: user.name, email: plainEmail, totalExplored: user.totalExplored, explorationStreak: user.explorationStreak } });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", requireAuth, (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out." });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as import("../lib/auth").AuthRequest).userId);
    if (!user) { res.status(404).json({ error: "User not found." }); return; }
    const plainEmail = decrypt(user.emailEncrypted);
    res.json({ user: { id: String(user._id), name: user.name, email: plainEmail, totalExplored: user.totalExplored, explorationStreak: user.explorationStreak } });
  } catch (err) {
    console.error("[me]", err);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

export default router;
