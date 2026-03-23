"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useMapStore, type TerrainFilter, type RoadFilter } from "@/store/useMapStore";
import { useExplorationStore } from "@/store/useExplorationStore";
import Navbar from "@/components/Navbar";
import {
  Compass,
  Navigation,
  TreePine,
  Map,
  Bookmark,
  ExternalLink,
  AlertCircle,
  Info,
  Mountain,
  Trees,
  Waves,
  Sun,
  Route,
  ShieldAlert,
  Hospital,
  Shield,
  Train,
  Bus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        background: "var(--sky-light)",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--sky-dark)",
        fontSize: "0.9rem",
      }}
    >
      Loading map…
    </div>
  ),
});

const TERRAIN_OPTIONS: { key: TerrainFilter; label: string; icon: typeof Mountain }[] = [
  { key: "hill", label: "Hills", icon: Mountain },
  { key: "forest", label: "Forest", icon: Trees },
  { key: "lake", label: "Lake/Dam", icon: Waves },
  { key: "beach", label: "Beach", icon: Sun },
  { key: "straight_road", label: "Long Road", icon: Route },
];

const ROAD_OPTIONS: { key: RoadFilter | "all"; label: string }[] = [
  { key: "all", label: "All Roads" },
  { key: "paved", label: "Paved" },
  { key: "unpaved", label: "Unpaved" },
  { key: "trekking", label: "Trekking" },
];

const FACILITY_META: Record<string, { icon: typeof Hospital; color: string; label: string }> = {
  hospital: { icon: Hospital, color: "#DC2626", label: "Hospital" },
  police: { icon: Shield, color: "#2563EB", label: "Police Station" },
  railway_station: { icon: Train, color: "#EA580C", label: "Railway Station" },
  bus_stop: { icon: Bus, color: "#7C3AED", label: "Bus Stop" },
};

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    selectedLocation,
    mapCenter,
    zoom,
    selectedRadius,
    isGenerating,
    selectedTerrains,
    selectedRoadType,
    nearbyFacilities,
    setSelectedLocation,
    setIsGenerating,
    setSelectedRadius,
    toggleTerrain,
    selectAllTerrains,
    setSelectedRoadType,
    setNearbyFacilities,
  } = useMapStore();
  const { addSavedLocation, isSaving, setIsSaving } = useExplorationStore();

  const [error, setError] = useState("");
  const [noLocationFound, setNoLocationFound] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showFacilities, setShowFacilities] = useState(true);
  const saveNoteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    // Wake up the Render backend on page load to prevent cold-start on first generate
    const RENDER = process.env.NEXT_PUBLIC_RENDER_API_URL ?? "http://localhost:8080";
    fetch(`${RENDER}/api/health`).catch(() => {});
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, router, mounted]);

  if (!mounted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream)" }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--green)", borderRadius: "50%" }} />
      </div>
    );
  }

  async function fetchFacilities(lat: number, lng: number) {
    try {
      const res = await fetch(`/api/nearby-facilities?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        setNearbyFacilities(data.facilities ?? []);
      }
    } catch {
      // Silently fail — facilities are supplementary
    }
  }

  async function handleGenerate() {
    setError("");
    setNoLocationFound(false);
    setSaveSuccess(false);
    setShowSaveForm(false);
    setIsGenerating(true);
    setNearbyFacilities([]);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setIsGenerating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          // Build query params
          const params = new URLSearchParams({
            radius: String(selectedRadius),
            lat: String(latitude),
            lng: String(longitude),
          });

          // Terrain filters
          if (selectedTerrains.size > 0) {
            params.set("terrain", Array.from(selectedTerrains).join(","));
          }

          // Road filter
          if (selectedRoadType !== "all") {
            params.set("road", selectedRoadType);
          }

          // Get JWT from Netlify (tiny/instant), then call Render directly
          const RENDER = process.env.NEXT_PUBLIC_RENDER_API_URL ?? "http://localhost:8080";

          const tokenRes = await fetch("/api/token");
          if (!tokenRes.ok) {
            setError("Session expired. Please log in again.");
            return;
          }
          const { token } = await tokenRes.json();

          const res = await fetch(
            `${RENDER}/api/generate-location?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 404) {
              setNoLocationFound(true);
            } else {
              setError(data.error ?? "Failed to generate location.");
            }
            return;
          }
          const loc = {
            lat: data.coordinates.lat,
            lng: data.coordinates.lng,
            distanceKm: data.distanceKm,
            terrainType: data.terrainType,
            carpeTerraScore: data.carpeTerraScore,
            footfallScore: data.carpeTerraScore, // backward compat
            roadType: data.roadType,
            isRemote: data.isRemote,
            altitude: data.altitude,
          };
          setSelectedLocation(loc);

          // Fetch nearby facilities in background
          fetchFacilities(loc.lat, loc.lng);
        } catch {
          setError("Network error. Please try again.");
        } finally {
          setIsGenerating(false);
        }
      },
      () => {
        setIsGenerating(false);
        setError("Location access denied. Please enable location services to discover routes near you.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function handleSave() {
    if (!selectedLocation) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/save-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          notes: saveNote,
          terrainType: selectedLocation.terrainType,
          footfallScore: selectedLocation.carpeTerraScore,
          distanceKm: selectedLocation.distanceKm,
          dateExplored: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      addSavedLocation({
        _id: data.location._id,
        coordinates: { lat: selectedLocation.lat, lng: selectedLocation.lng },
        distanceKm: selectedLocation.distanceKm,
        terrainType: selectedLocation.terrainType,
        footfallScore: selectedLocation.carpeTerraScore,
        notes: saveNote,
        imageUrl: "",
        dateExplored: new Date().toISOString(),
      });
      setSaveSuccess(true);
      setShowSaveForm(false);
      setSaveNote("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const scoreLabel =
    selectedLocation?.carpeTerraScore !== undefined
      ? selectedLocation.carpeTerraScore >= 80
        ? { text: "Very Hidden", color: "var(--green)" }
        : selectedLocation.carpeTerraScore >= 50
        ? { text: "Moderately Hidden", color: "#CA8A04" }
        : { text: "Some Activity", color: "#9A3412" }
      : null;

  const isAllTerrains = selectedTerrains.size === 0;

  return (
    <>
      <Navbar />
      <main className="flex flex-col lg:grid lg:grid-cols-[400px_1fr] min-h-[calc(100vh-64px)] w-full">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="bg-white border-b lg:border-b-0 lg:border-r border-[var(--border)] p-6 md:p-8 flex flex-col gap-5 overflow-y-auto lg:h-[calc(100vh-64px)] z-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] lg:shadow-none">
          {/* Header */}
          <div>
            <h1 className="font-bold text-xl md:text-[1.3rem] mb-1">
              Route Generator
            </h1>
            <p className="text-[var(--ink-muted)] text-sm">
              Discover hidden roads near you
            </p>
          </div>

          {/* Radius selector */}
          <div>
            <label className="block font-semibold text-sm mb-2.5">
              Search Radius
            </label>
            <div className="flex gap-2">
              {([20, 50, 100] as const).map((r) => (
                <button
                  key={r}
                  id={`radius-${r}`}
                  onClick={() => setSelectedRadius(r)}
                  className="flex-1 py-2.5 rounded-[10px] font-semibold text-sm transition-all duration-150 border-2"
                  style={{
                    borderColor: selectedRadius === r ? "var(--green)" : "var(--border)",
                    background: selectedRadius === r ? "var(--green-mist)" : "transparent",
                    color: selectedRadius === r ? "var(--green-dark)" : "var(--ink-muted)",
                  }}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* ── Terrain filter (multi-select) ─────────────────────────────── */}
          <div>
            <label className="block font-semibold text-sm mb-2.5">
              Terrain Type
            </label>
            <div className="flex flex-wrap gap-2">
              {/* "All" pill */}
              <button
                id="terrain-all"
                onClick={selectAllTerrains}
                className="px-3 py-2 rounded-[10px] font-semibold text-xs transition-all duration-150 border-2 flex items-center gap-1.5"
                style={{
                  borderColor: isAllTerrains ? "var(--green)" : "var(--border)",
                  background: isAllTerrains ? "var(--green-mist)" : "transparent",
                  color: isAllTerrains ? "var(--green-dark)" : "var(--ink-muted)",
                }}
              >
                <Compass size={13} />
                All
              </button>
              {TERRAIN_OPTIONS.map(({ key, label, icon: Icon }) => {
                const active = selectedTerrains.has(key);
                return (
                  <button
                    key={key}
                    id={`terrain-${key}`}
                    onClick={() => toggleTerrain(key)}
                    className="px-3 py-2 rounded-[10px] font-semibold text-xs transition-all duration-150 border-2 flex items-center gap-1.5"
                    style={{
                      borderColor: active ? "var(--green)" : "var(--border)",
                      background: active ? "var(--green-mist)" : "transparent",
                      color: active ? "var(--green-dark)" : "var(--ink-muted)",
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Road type filter (single-select) ──────────────────────────── */}
          <div>
            <label className="block font-semibold text-sm mb-2.5">
              Road Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ROAD_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  id={`road-${key}`}
                  onClick={() => setSelectedRoadType(key)}
                  className="px-3 py-2 rounded-[10px] font-semibold text-xs transition-all duration-150 border-2"
                  style={{
                    borderColor: selectedRoadType === key ? "var(--green)" : "var(--border)",
                    background: selectedRoadType === key ? "var(--green-mist)" : "transparent",
                    color: selectedRoadType === key ? "var(--green-dark)" : "var(--ink-muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            id="generate-route-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary w-full justify-center py-3"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
                Scanning roads…
              </>
            ) : (
              <>
                <Compass size={17} />
                Generate Hidden Route
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-3.5 py-3 text-[#991B1B] text-sm">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* No location found warning */}
          {noLocationFound && (
            <div className="flex items-start gap-2.5 bg-[#FFF7ED] border border-[#FDBA74] rounded-[10px] px-3.5 py-3 text-[#9A3412] text-sm animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[0.82rem] mb-1">No hidden spots found nearby</strong>
                <span className="text-[0.8rem] leading-relaxed">
                  This area may be too densely populated or flat. Try a{" "}
                  <button
                    onClick={() => { setSelectedRadius(100); setNoLocationFound(false); }}
                    className="underline font-semibold"
                  >
                    100 km radius
                  </button>
                  {" "}or remove terrain/road filters.
                </span>
              </div>
            </div>
          )}

          {/* Save success */}
          {saveSuccess && (
            <div className="flex items-center gap-2 bg-[var(--green-mist)] border border-[var(--green-light)] rounded-[10px] px-3.5 py-3 text-[var(--green-dark)] text-sm font-medium">
              ✓ Location saved to your log!
            </div>
          )}

          {/* ── Safety Warning ────────────────────────────────────────────── */}
          {selectedLocation?.isRemote && (
            <div className="flex items-start gap-2.5 bg-[#FFF7ED] border border-[#FDBA74] rounded-[12px] px-4 py-3.5 text-[#9A3412] text-sm animate-fade-in">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[0.82rem] mb-0.5">⚠️ Remote Area Warning</strong>
                <span className="text-[0.8rem] leading-relaxed">
                  This location is very remote and may be unsafe for solo travellers.
                  Always travel with friends and inform someone of your plans before visiting.
                </span>
              </div>
            </div>
          )}

          {/* Result card */}
          {selectedLocation && (
            <div className="animate-fade-up bg-[var(--cream)] rounded-xl border border-[var(--border)] p-4 md:p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[0.95rem]">Location Found</span>
                {scoreLabel && (
                  <span
                    className="badge shrink-0 text-xs"
                    style={{
                      background: `${scoreLabel.color}18`,
                      color: scoreLabel.color,
                      border: `1px solid ${scoreLabel.color}30`,
                    }}
                  >
                    {scoreLabel.text}
                  </span>
                )}
              </div>

              {/* Coordinate row */}
              <div className="flex items-center gap-2 text-[0.82rem] text-[var(--ink-soft)]">
                <Navigation size={13} color="var(--sky-dark)" className="shrink-0" />
                <span className="font-mono break-all">
                  {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Map, label: "Distance", value: `${selectedLocation.distanceKm} km` },
                  { icon: TreePine, label: "Terrain", value: selectedLocation.terrainType },
                  { icon: Info, label: "Road Type", value: selectedLocation.roadType },
                  { icon: Compass, label: "Carpe Terra Score", value: `${selectedLocation.carpeTerraScore}/100` },
                  ...(selectedLocation.altitude !== null
                    ? [{ icon: Mountain, label: "Altitude", value: `${selectedLocation.altitude}m` }]
                    : []),
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white rounded-lg p-2.5 md:p-3 border border-[var(--border)] flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-[var(--ink-muted)] text-xs mb-1">
                      <Icon size={11} />
                      {label}
                    </div>
                    <div className="font-semibold text-sm text-[var(--ink)] truncate">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Nearby Facilities ───────────────────────────────────────── */}
              {nearbyFacilities.length > 0 && (
                <div className="border-t border-[var(--border)] pt-3 mt-1">
                  <button
                    onClick={() => setShowFacilities(!showFacilities)}
                    className="flex items-center justify-between w-full text-left text-sm font-semibold mb-2"
                  >
                    <span>Nearby Facilities</span>
                    {showFacilities ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showFacilities && (
                    <div className="flex flex-col gap-2 animate-fade-in">
                      {nearbyFacilities.map((f) => {
                        const meta = FACILITY_META[f.type];
                        if (!meta) return null;
                        const FIcon = meta.icon;
                        return (
                          <div
                            key={f.type}
                            className="flex items-center gap-2.5 bg-white rounded-lg p-2.5 border border-[var(--border)]"
                          >
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: `${meta.color}15` }}
                            >
                              <FIcon size={14} color={meta.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate">{f.name}</div>
                              <div className="text-[0.7rem] text-[var(--ink-muted)]">
                                {meta.label} · {f.distanceKm} km away
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <a
                  href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex-1 justify-center text-sm py-2.5 no-underline"
                >
                  <ExternalLink size={14} />
                  Google Maps
                </a>
                <button
                  id="save-location-btn"
                  onClick={() => setShowSaveForm(!showSaveForm)}
                  className="btn-primary flex-1 justify-center text-sm py-2.5"
                >
                  <Bookmark size={14} />
                  Save
                </button>
              </div>

              {/* Save form */}
              {showSaveForm && (
                <div className="animate-fade-in flex flex-col gap-2.5 mt-1 border-t border-[var(--border)] pt-4">
                  <textarea
                    ref={saveNoteRef}
                    placeholder="Add notes about this location (optional)…"
                    value={saveNote}
                    onChange={(e) => setSaveNote(e.target.value)}
                    className="input-field min-h-[80px] resize-y text-sm"
                    maxLength={2000}
                  />
                  <button
                    id="confirm-save-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary justify-center w-full py-2.5 text-sm"
                  >
                    {isSaving ? "Saving…" : "Confirm Save"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!selectedLocation && !isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-10 text-center gap-3 text-[var(--ink-muted)]">
              <div className="w-16 h-16 bg-[var(--green-mist)] rounded-[20px] flex items-center justify-center shrink-0">
                <Map size={30} color="var(--green)" />
              </div>
              <p className="text-sm max-w-[220px]">
                Select filters and click <strong>Generate</strong> to discover a hidden route
              </p>
              <Link href="/dashboard" className="text-[var(--green)] text-sm font-semibold no-underline hover:underline mt-1">
                View saved locations →
              </Link>
            </div>
          )}
        </aside>

        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <div className="relative w-full h-[50vh] min-h-[400px] lg:h-auto lg:flex-1 lg:min-h-0 bg-[var(--sky-light)] z-0">
          <div className="absolute inset-0">
            <MapView
              location={selectedLocation}
              center={mapCenter}
              zoom={zoom}
              facilities={nearbyFacilities}
            />
          </div>
        </div>
      </main>
    </>
  );
}
