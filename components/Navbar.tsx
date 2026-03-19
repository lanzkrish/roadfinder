"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useExplorationStore } from "@/store/useExplorationStore";
import { Compass, LogOut, Map, BarChart3, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, isAuthenticated, clearUser } = useAuthStore();
  const { clearExploration } = useExplorationStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearUser();
    clearExploration();
    router.push("/");
    setMobileOpen(false);
  }

  return (
    <nav
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--green)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Compass size={20} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.3px" }}>
            Carpe Terra
          </span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="hidden sm:flex">
          {isAuthenticated ? (
            <>
              <Link href="/explore" className="btn-ghost">
                <Map size={16} />
                Explore
              </Link>
              <Link href="/dashboard" className="btn-ghost">
                <BarChart3 size={16} />
                Dashboard
              </Link>
              <span
                style={{
                  width: 1,
                  height: 24,
                  background: "var(--border)",
                  margin: "0 4px",
                }}
              />
              <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)", fontWeight: 500 }}>
                {user?.name}
              </span>
              <button onClick={handleLogout} className="btn-ghost" style={{ color: "var(--ink-muted)" }}>
                <LogOut size={15} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <Link href="/signup" className="btn-primary">Get started</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden btn-ghost"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {isAuthenticated ? (
            <>
              <Link href="/explore" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                <Map size={16} />Explore
              </Link>
              <Link href="/dashboard" className="btn-ghost" onClick={() => setMobileOpen(false)}>
                <BarChart3 size={16} />Dashboard
              </Link>
              <button onClick={handleLogout} className="btn-ghost" style={{ justifyContent: "flex-start" }}>
                <LogOut size={15} />Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost" onClick={() => setMobileOpen(false)}>Sign in</Link>
              <Link href="/signup" className="btn-primary" onClick={() => setMobileOpen(false)}>Get started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
