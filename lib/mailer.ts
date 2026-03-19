/**
 * Nodemailer SMTP transporter — server-side only.
 * Supports Gmail (with App Password), SendGrid SMTP, Mailgun, etc.
 */

import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465, // TLS on 465
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });
}

const FROM = process.env.SMTP_FROM ?? "Carpe Terra <noreply@carpaterra.app>";

// ── Email templates ───────────────────────────────────────────────────────────

function otpTemplate(otp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Verify your Carpe Terra account</title></head>
<body style="margin:0;padding:0;background:#F8F9FA;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;" cellpadding="0" cellspacing="0">
        <!-- Header -->
        <tr><td style="background:#2D6A4F;padding:32px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <span style="font-size:24px;">🧭</span>
            <span style="color:#fff;font-size:1.3rem;font-weight:700;letter-spacing:-0.3px;">Carpe Terra</span>
          </div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:1.4rem;font-weight:700;color:#1A1A2E;">Verify your email</h1>
          <p style="margin:0 0 32px;color:#6B7280;line-height:1.6;">Use the code below to complete your registration. It expires in <strong>10 minutes</strong>.</p>
          <!-- OTP box -->
          <div style="background:#F0FDF4;border:2px solid #D8F3DC;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
            <div style="font-size:2.8rem;font-weight:700;letter-spacing:12px;color:#2D6A4F;font-family:monospace;">${otp}</div>
          </div>
          <p style="margin:0;color:#9CA3AF;font-size:0.85rem;line-height:1.6;">
            If you didn't create a Carpe Terra account, you can safely ignore this email.<br>
            Do not share this code with anyone.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#F8F9FA;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;">
          <p style="margin:0;color:#9CA3AF;font-size:0.8rem;">Seize the Earth · © ${new Date().getFullYear()} Carpe Terra</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP verification email.
 */
export async function sendVerificationEmail(to: string, otp: string): Promise<void> {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `${otp} is your Carpe Terra verification code`,
    text: `Your Carpe Terra verification code is: ${otp}\nIt expires in 10 minutes.\nDo not share this code.`,
    html: otpTemplate(otp),
  });
}

/**
 * Send a welcome email after successful registration.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Welcome to Carpe Terra, ${name}! 🧭`,
    text: `Hi ${name},\n\nWelcome to Carpe Terra! Your account is now active.\n\nStart exploring hidden routes at ${process.env.NEXT_PUBLIC_APP_URL ?? "https://carpaterra.app"}\n\nHappy exploring,\nThe Carpe Terra Team`,
    html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:Inter,system-ui,sans-serif;background:#F8F9FA;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
    <div style="background:#2D6A4F;padding:32px 40px;text-align:center;">
      <span style="color:#fff;font-size:1.3rem;font-weight:700;">🧭 Carpe Terra</span>
    </div>
    <div style="padding:40px;">
      <h1 style="margin:0 0 12px;color:#1A1A2E;font-size:1.4rem;">Welcome, ${name}! 🎉</h1>
      <p style="color:#6B7280;line-height:1.7;margin:0 0 24px;">Your account is live. Start discovering hidden roads and scenic routes that maps don't show you.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://carpaterra.app"}/explore" style="display:inline-block;background:#2D6A4F;color:#fff;padding:14px 28px;border-radius:9999px;text-decoration:none;font-weight:600;">Start Exploring →</a>
    </div>
  </div>
</body></html>`,
  });
}
