import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "ct_token";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not defined.");
}

export interface JWTPayload {
  userId: string;
  email: string;
}

// ── Password Hashing ─────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── JWT ──────────────────────────────────────────────────────────────────────

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ── Cookie Helpers ───────────────────────────────────────────────────────────

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

export async function getAuthCookieToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

// ── Auth Guard ───────────────────────────────────────────────────────────────

export async function requireAuth(): Promise<JWTPayload> {
  const token = await getAuthCookieToken();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }
  const payload = verifyJWT(token);
  if (!payload) {
    throw new Error("UNAUTHORIZED");
  }
  return payload;
}
