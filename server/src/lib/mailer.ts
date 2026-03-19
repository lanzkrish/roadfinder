import nodemailer from "nodemailer";

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER ?? "", pass: process.env.SMTP_PASS ?? "" },
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });
}

const FROM = process.env.SMTP_FROM ?? "Carpe Terra <noreply@carpaterra.app>";

export async function sendVerificationEmail(to: string, otp: string) {
  await transporter().sendMail({
    from: FROM, to,
    subject: `${otp} is your Carpe Terra verification code`,
    text: `Your verification code is: ${otp}\nExpires in 10 minutes.`,
    html: `<div style="font-family:Inter,sans-serif;max-width:400px;margin:auto;padding:40px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.06)"><div style="background:#2D6A4F;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px"><span style="color:#fff;font-size:1.2rem;font-weight:700">🧭 Carpe Terra</span></div><h2 style="margin:0 0 8px;color:#1A1A2E">Verify your email</h2><p style="color:#6B7280;line-height:1.6;margin:0 0 24px">Enter this code to activate your account (expires in 10 minutes):</p><div style="background:#F0FDF4;border:2px solid #D8F3DC;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px"><span style="font-size:2.5rem;font-weight:700;letter-spacing:10px;color:#2D6A4F;font-family:monospace">${otp}</span></div><p style="color:#9CA3AF;font-size:0.8rem">Do not share this code. If you didn't request this, ignore this email.</p></div>`,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const url = process.env.FRONTEND_URL ?? "https://carpaterra.app";
  await transporter().sendMail({
    from: FROM, to,
    subject: `Welcome to Carpe Terra, ${name}! 🧭`,
    text: `Hi ${name},\n\nYour account is active. Start exploring at: ${url}/explore`,
    html: `<div style="font-family:Inter,sans-serif;max-width:400px;margin:auto;padding:40px"><div style="background:#2D6A4F;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px"><span style="color:#fff;font-size:1.2rem;font-weight:700">🧭 Carpe Terra</span></div><h2 style="color:#1A1A2E">Welcome, ${name}! 🎉</h2><p style="color:#6B7280;line-height:1.7">Your account is live. Time to discover hidden roads and scenic routes.</p><a href="${url}/explore" style="display:inline-block;background:#2D6A4F;color:#fff;padding:14px 28px;border-radius:9999px;text-decoration:none;font-weight:600;margin-top:16px">Start Exploring →</a></div>`,
  });
}
