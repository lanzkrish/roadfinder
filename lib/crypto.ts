/**
 * AES-256-GCM email encryption — server-side only.
 * Emails are stored encrypted in MongoDB; a deterministic SHA-256 hash
 * is used for indexed lookups without decrypting.
 */

import crypto from "crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY ?? "";
if (!KEY_HEX || KEY_HEX.length < 64) {
  // 32 bytes = 64 hex chars
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes).");
  }
}

// Derive 32-byte Buffer from hex string, pad/truncate for dev safety
function getKey(): Buffer {
  const padded = KEY_HEX.padEnd(64, "0").slice(0, 64);
  return Buffer.from(padded, "hex");
}

// ── Encryption ────────────────────────────────────────────────────────────────

/**
 * Encrypt a plain-text string using AES-256-GCM.
 * Returns a single `iv:authTag:ciphertext` hex string.
 */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a `iv:authTag:ciphertext` hex string.
 * Throws if tampered.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format.");
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}

// ── Deterministic hash for indexed lookups ─────────────────────────────────

/**
 * SHA-256 hash of the lowercased email — used as a DB index.
 * Deterministic so we can look up users without decrypting all records.
 */
export function hashEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}
