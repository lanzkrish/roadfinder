"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Compass, Mail, Lock, User, Eye, EyeOff,
  AlertCircle, CheckCircle, ShieldCheck, RefreshCw,
} from "lucide-react";

// ── OTP Input Panel ─────────────────────────────────────────────────────────

function OTPPanel({
  email,
  onSuccess,
  onBack,
}: {
  email: string;
  onSuccess: (user: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => { if (i < 6) newOtp[i] = d; });
      setOtp(newOtp);
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = otp.join("");
    if (code.length !== 6) { setError("Enter all 6 digits."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verification failed."); return; }
      onSuccess(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendCooldown(60);
    setError("");
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    // Re-submit registration to resend OTP
    try {
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "__RESEND__", name: "Resend" }),
      });
    } catch { /* ignore */ }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            width: 52, height: 52, background: "var(--green-mist)",
            borderRadius: 16, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 12px",
          }}
        >
          <ShieldCheck size={26} color="var(--green)" />
        </div>
        <h2 style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: 6 }}>
          Check your inbox
        </h2>
        <p style={{ color: "var(--ink-muted)", fontSize: "0.875rem", lineHeight: 1.5 }}>
          We sent a 6-digit code to<br />
          <strong style={{ color: "var(--ink)" }}>{email}</strong>
        </p>
      </div>

      {/* OTP boxes */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{
              width: 48, height: 56,
              textAlign: "center",
              fontSize: "1.4rem",
              fontWeight: 700,
              border: `2px solid ${digit ? "var(--green)" : "var(--border)"}`,
              borderRadius: 10,
              outline: "none",
              background: digit ? "var(--green-mist)" : "var(--white)",
              color: "var(--ink)",
              transition: "all 0.15s ease",
              fontFamily: "monospace",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--green)";
              e.target.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.12)";
            }}
            onBlur={(e) => {
              if (!digit) e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#FEF2F2", border: "1px solid #FECACA",
          borderRadius: 8, padding: "10px 14px", color: "#991B1B",
          fontSize: "0.875rem", marginBottom: 16,
        }}>
          <AlertCircle size={15} />{error}
        </div>
      )}

      <button
        id="verify-otp-btn"
        onClick={handleVerify}
        disabled={loading || otp.join("").length < 6}
        className="btn-primary"
        style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}
      >
        {loading
          ? <><span className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block" }} /> Verifying…</>
          : <><ShieldCheck size={16} /> Verify & Create Account</>
        }
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="btn-ghost" style={{ padding: "6px 0", fontSize: "0.85rem" }}>
          ← Back
        </button>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="btn-ghost"
          style={{ padding: "6px 0", fontSize: "0.85rem", color: resendCooldown > 0 ? "var(--ink-muted)" : "var(--green)" }}
        >
          <RefreshCw size={13} />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}

// ── Main Signup Page ─────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pwStrong = password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!pwStrong) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
      // Go to OTP step
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleVerified(user: Record<string, unknown>) {
    setUser({
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      totalExplored: (user.totalExplored as number) ?? 0,
      explorationStreak: (user.explorationStreak as number) ?? 0,
    });
    router.push("/explore");
  }

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "24px",
        background: "radial-gradient(ellipse 80% 60% at 80% 90%, rgba(82,183,136,0.15) 0%, transparent 60%), var(--cream)",
      }}
    >
      <div className="card animate-fade-up" style={{ width: "100%", maxWidth: 440, padding: "40px 36px" }}>

        {step === "otp" ? (
          <OTPPanel
            email={email}
            onSuccess={handleVerified}
            onBack={() => { setStep("form"); setError(""); }}
          />
        ) : (
          <>
            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{
                width: 52, height: 52, background: "var(--green)", borderRadius: 16,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
              }}>
                <Compass size={26} color="white" />
              </div>
              <h1 style={{ fontWeight: 700, fontSize: "1.4rem", marginBottom: 4 }}>Start your journey</h1>
              <p style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>
                Create your free exploration account
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name */}
              <div>
                <label htmlFor="signup-name" style={{ display: "block", fontWeight: 500, fontSize: "0.85rem", marginBottom: 6 }}>
                  Full Name
                </label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)" }} />
                  <input
                    id="signup-name" type="text" autoComplete="name"
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Traveler" required
                    className="input-field" style={{ paddingLeft: 40 }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" style={{ display: "block", fontWeight: 500, fontSize: "0.85rem", marginBottom: 6 }}>
                  Email
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)" }} />
                  <input
                    id="signup-email" type="email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com" required
                    className="input-field" style={{ paddingLeft: 40 }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" style={{ display: "block", fontWeight: 500, fontSize: "0.85rem", marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)" }} />
                  <input
                    id="signup-password" type={showPw ? "text" : "password"} autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" required
                    className="input-field" style={{ paddingLeft: 40, paddingRight: 44 }}
                  />
                  <button
                    type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-muted)", padding: 4 }}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: "0.8rem", color: pwStrong ? "var(--green)" : "#EF4444" }}>
                    {pwStrong ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                    {pwStrong ? "Strong password" : "Too short (min 8 chars)"}
                  </div>
                )}
              </div>

              {/* SMTP notice */}
              <div style={{ display: "flex", gap: 8, background: "var(--sky-light)", borderRadius: 8, padding: "10px 12px", fontSize: "0.8rem", color: "var(--sky-dark)" }}>
                <Mail size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                We&apos;ll send a verification code to your email to activate your account.
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#991B1B", fontSize: "0.875rem" }}>
                  <AlertCircle size={15} />{error}
                </div>
              )}

              <button
                type="submit" id="signup-submit"
                disabled={loading}
                className="btn-primary"
                style={{ justifyContent: "center", marginTop: 4 }}
              >
                {loading
                  ? <><span className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block" }} />Sending code…</>
                  : "Continue →"
                }
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--ink-muted)" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
