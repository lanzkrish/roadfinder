"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useExplorationStore, SavedLocation } from "@/store/useExplorationStore";
import Navbar from "@/components/Navbar";
import {
  Map,
  Flame,
  Navigation,
  TreePine,
  Calendar,
  BarChart3,
  ArrowRight,
  MapPin,
} from "lucide-react";

function LocationCard({ loc }: { loc: SavedLocation }) {
  const date = new Date(loc.dateExplored).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const footfallColor =
    loc.footfallScore >= 80
      ? "var(--green)"
      : loc.footfallScore >= 50
      ? "#CA8A04"
      : "#9A3412";

  return (
    <div
      className="card card-hover"
      style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--green-mist)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MapPin size={17} color="var(--green)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{loc.terrainType}</div>
            <div style={{ color: "var(--ink-muted)", fontSize: "0.75rem", fontFamily: "monospace" }}>
              {loc.coordinates.lat.toFixed(4)}, {loc.coordinates.lng.toFixed(4)}
            </div>
          </div>
        </div>
        <span
          className="badge"
          style={{ background: `${footfallColor}18`, color: footfallColor, border: `1px solid ${footfallColor}30`, whiteSpace: "nowrap" }}
        >
          {loc.footfallScore}/100
        </span>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: 16, fontSize: "0.8rem", color: "var(--ink-muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Navigation size={11} />{loc.distanceKm} km away
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Calendar size={11} />{date}
        </span>
      </div>

      {/* Notes */}
      {loc.notes && (
        <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.5, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          {loc.notes}
        </p>
      )}

      {/* Google Maps link */}
      <a
        href={`https://www.google.com/maps?q=${loc.coordinates.lat},${loc.coordinates.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--green)", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
      >
        Open in Google Maps <ArrowRight size={12} />
      </a>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { savedLocations, setSavedLocations, isLoadingList, setIsLoadingList } = useExplorationStore();
  const [serverUser, setServerUser] = useState<{ totalExplored: number; explorationStreak: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, mounted]);

  async function fetchLocations() {
    setIsLoadingList(true);
    try {
      const res = await fetch("/api/user/locations");
      if (res.ok) {
        const data = await res.json();
        setSavedLocations(data.locations);
        setServerUser(data.user);
      }
    } finally {
      setIsLoadingList(false);
    }
  }

  if (!mounted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream)" }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--green)", borderRadius: "50%" }} />
      </div>
    );
  }

  const totalExplored = serverUser?.totalExplored ?? user?.totalExplored ?? 0;
  const streak = serverUser?.explorationStreak ?? user?.explorationStreak ?? 0;

  const stats = [
    { icon: Map, label: "Locations Saved", value: totalExplored, color: "var(--green)" },
    { icon: Flame, label: "Streak", value: `${streak} days`, color: "#EA580C" },
    { icon: TreePine, label: "Unique Terrains", value: new Set(savedLocations.map((l) => l.terrainType)).size, color: "var(--sky-dark)" },
    { icon: BarChart3, label: "Avg. Footfall Score", value: savedLocations.length ? Math.round(savedLocations.reduce((a, b) => a + b.footfallScore, 0) / savedLocations.length) : "—", color: "#7C3AED" },
  ];

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontWeight: 700, fontSize: "1.8rem", marginBottom: 4 }}>
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "var(--ink-muted)" }}>Your exploration dashboard</p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 40,
          }}
        >
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card" style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: `${color}18`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color={color} />
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)", fontWeight: 500 }}>{label}</span>
              </div>
              <div style={{ fontSize: "1.9rem", fontWeight: 700, color: "var(--ink)" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Locations */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Saved Locations</h2>
            <Link href="/explore" className="btn-primary" style={{ padding: "9px 18px", fontSize: "0.85rem" }}>
              <Map size={14} />
              Explore More
            </Link>
          </div>

          {isLoadingList ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card" style={{ height: 160, background: "var(--cream)" }} />
              ))}
            </div>
          ) : savedLocations.length === 0 ? (
            <div
              className="card"
              style={{ padding: "60px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
            >
              <div style={{ width: 64, height: 64, background: "var(--green-mist)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={30} color="var(--green)" />
              </div>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>No saved locations yet</p>
                <p style={{ color: "var(--ink-muted)", fontSize: "0.875rem" }}>
                  Generate your first hidden route in the Explore tab!
                </p>
              </div>
              <Link href="/explore" className="btn-primary" style={{ marginTop: 4 }}>
                Start Exploring
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {savedLocations.map((loc) => (
                <LocationCard key={loc._id} loc={loc} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
