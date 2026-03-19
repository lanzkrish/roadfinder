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
    <div className="card card-hover flex flex-col gap-3 p-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-lg bg-[var(--green-mist)]">
            <MapPin size={17} color="var(--green)" />
          </div>
          <div>
            <div className="font-semibold text-sm">{loc.terrainType}</div>
            <div className="text-xs font-mono text-[var(--ink-muted)]">
              {loc.coordinates.lat.toFixed(4)}, {loc.coordinates.lng.toFixed(4)}
            </div>
          </div>
        </div>
        <span
          className="badge shrink-0"
          style={{ background: `${footfallColor}18`, color: footfallColor, border: `1px solid ${footfallColor}30`, whiteSpace: "nowrap" }}
        >
          {loc.footfallScore}/100
        </span>
      </div>

      {/* Meta */}
      <div className="flex gap-4 text-xs text-[var(--ink-muted)]">
        <span className="flex items-center gap-1.5">
          <Navigation size={11} />{loc.distanceKm} km
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar size={11} />{date}
        </span>
      </div>

      {/* Notes */}
      {loc.notes && (
        <p className="text-sm leading-relaxed text-[var(--ink-soft)] border-t border-[var(--border)] pt-2.5 mt-0.5">
          {loc.notes}
        </p>
      )}

      {/* Google Maps link */}
      <a
        href={`https://www.google.com/maps?q=${loc.coordinates.lat},${loc.coordinates.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--green)] mt-auto pt-1"
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--cream)]">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-[var(--border)] border-t-[var(--green)]" />
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
      <main className="max-w-[1100px] mx-auto w-full px-5 py-8 md:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-bold text-2xl md:text-3xl mb-1.5">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-[var(--ink-muted)] text-sm md:text-base">Your exploration dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card p-4 md:p-5 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 mb-3">
                <div 
                  className="w-8 h-8 md:w-9 md:h-9 shrink-0 rounded-[10px] flex items-center justify-center"
                  style={{ background: `${color}18` }}
                >
                  <Icon size={16} color={color} className="md:w-[18px] md:h-[18px]" />
                </div>
                <span className="text-xs md:text-sm font-medium text-[var(--ink-muted)] leading-tight">{label}</span>
              </div>
              <div className="text-2xl md:text-[1.9rem] font-bold text-[var(--ink)]">{value}</div>
            </div>
          ))}
        </div>

        {/* Locations */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="font-bold text-lg md:text-[1.1rem]">Saved Locations</h2>
            <Link href="/explore" className="btn-primary w-full sm:w-auto text-sm px-4 py-2.5 justify-center">
              <Map size={14} />
              Explore More
            </Link>
          </div>

          {isLoadingList ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-40 bg-[var(--cream)] animate-pulse" />
              ))}
            </div>
          ) : savedLocations.length === 0 ? (
            <div className="card p-10 md:p-14 text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-[var(--green-mist)] rounded-[20px] flex items-center justify-center">
                <MapPin size={30} color="var(--green)" />
              </div>
              <div>
                <p className="font-semibold mb-1">No saved locations yet</p>
                <p className="text-sm text-[var(--ink-muted)]">
                  Generate your first hidden route in the Explore tab!
                </p>
              </div>
              <Link href="/explore" className="btn-primary mt-2">
                Start Exploring
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
