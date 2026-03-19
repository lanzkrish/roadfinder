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
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-[1200px] mx-auto px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[var(--ink)] no-underline hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-[var(--green)] rounded-[10px] flex items-center justify-center">
            <Compass size={20} color="white" />
          </div>
          <span className="font-bold text-[1.15rem] tracking-tight">
            Carpe Terra
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2">
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
              <div className="w-[1px] h-6 bg-[var(--border)] mx-1" />
              <span className="text-[0.85rem] text-[var(--ink-muted)] font-medium px-2">
                {user?.name}
              </span>
              <button onClick={handleLogout} className="btn-ghost text-[var(--ink-muted)]">
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
          className="sm:hidden btn-ghost p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="sm:hidden absolute top-16 left-0 w-full bg-white/95 backdrop-blur-md border-b border-[var(--border)] shadow-lg flex flex-col p-4 gap-2 animate-fade-in">
          {isAuthenticated ? (
            <>
              <Link
                href="/explore"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--sky-light)] text-[var(--ink)] font-medium transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <Map size={18} className="text-[var(--ink-muted)]" /> Explore
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--sky-light)] text-[var(--ink)] font-medium transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <BarChart3 size={18} className="text-[var(--ink-muted)]" /> Dashboard
              </Link>
              <div className="h-[1px] bg-[var(--border)] my-1" />
              <div className="p-3 text-sm text-[var(--ink-muted)] font-medium">
                Signed in as {user?.name}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#FEF2F2] text-[#991B1B] font-medium transition-colors text-left"
              >
                <LogOut size={18} /> Sign out
              </button>
            </>
          ) : (
             <div className="flex flex-col gap-3">
              <Link href="/login" className="btn-ghost justify-center py-2.5" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary justify-center py-2.5" onClick={() => setMobileOpen(false)}>
                Get started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
