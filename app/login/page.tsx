"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Compass, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      setUser(data.user);
      router.push("/explore");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(168,218,220,0.2) 0%, transparent 60%), var(--cream)",
      }}
    >
      <div className="card animate-fade-up" style={{ width: "100%", maxWidth: 420, padding: "40px 36px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "var(--green)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Compass size={26} color="white" />
          </div>
          <h1 style={{ fontWeight: 700, fontSize: "1.4rem", marginBottom: 4 }}>Welcome back</h1>
          <p style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>
            Sign in to continue exploring
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label htmlFor="login-email" style={{ display: "block", fontWeight: 500, fontSize: "0.85rem", marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)" }}
              />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="input-field"
                style={{ paddingLeft: 40 }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" style={{ display: "block", fontWeight: 500, fontSize: "0.85rem", marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)" }}
              />
              <input
                id="login-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-field"
                style={{ paddingLeft: 40, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-muted)",
                  padding: 4,
                }}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#991B1B",
                fontSize: "0.875rem",
              }}
            >
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="btn-primary"
            style={{ justifyContent: "center", marginTop: 4 }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block" }} />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--ink-muted)" }}>
          New here?{" "}
          <Link href="/signup" style={{ color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
