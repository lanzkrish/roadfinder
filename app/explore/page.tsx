"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useMapStore } from "@/store/useMapStore";
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

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    selectedLocation,
    mapCenter,
    zoom,
    selectedRadius,
    isGenerating,
    setSelectedLocation,
    setIsGenerating,
    setSelectedRadius,
  } = useMapStore();
  const { addSavedLocation, isSaving, setIsSaving } = useExplorationStore();

  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const saveNoteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

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

  async function handleGenerate() {
    setError("");
    setSaveSuccess(false);
    setShowSaveForm(false);
    setIsGenerating(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setIsGenerating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/generate-location?radius=${selectedRadius}&lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Failed to generate location.");
            return;
          }
          setSelectedLocation({
            lat: data.coordinates.lat,
            lng: data.coordinates.lng,
            distanceKm: data.distanceKm,
            terrainType: data.terrainType,
            footfallScore: data.footfallScore,
            roadType: data.roadType,
          });
        } catch {
          setError("Network error. Please try again.");
        } finally {
          setIsGenerating(false);
        }
      },
      (geoError) => {
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
          footfallScore: selectedLocation.footfallScore,
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
        footfallScore: selectedLocation.footfallScore,
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


  const footfallLabel =
    selectedLocation?.footfallScore !== undefined
      ? selectedLocation.footfallScore >= 80
        ? { text: "Very Hidden", color: "var(--green)" }
        : selectedLocation.footfallScore >= 50
        ? { text: "Moderately Hidden", color: "#CA8A04" }
        : { text: "Some Activity", color: "#9A3412" }
      : null;

  return (
    <>
      <Navbar />
      <main className="flex flex-col lg:grid lg:grid-cols-[380px_1fr] min-h-[calc(100vh-64px)] w-full">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="bg-white border-b lg:border-b-0 lg:border-r border-[var(--border)] p-6 md:p-8 flex flex-col gap-6 overflow-y-auto lg:h-[calc(100vh-64px)] z-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] lg:shadow-none">
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

          {/* Save success */}
          {saveSuccess && (
            <div className="flex items-center gap-2 bg-[var(--green-mist)] border border-[var(--green-light)] rounded-[10px] px-3.5 py-3 text-[var(--green-dark)] text-sm font-medium">
              ✓ Location saved to your log!
            </div>
          )}

          {/* Result card */}
          {selectedLocation && (
            <div className="animate-fade-up bg-[var(--cream)] rounded-xl border border-[var(--border)] p-4 md:p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[0.95rem]">Location Found</span>
                {footfallLabel && (
                  <span
                    className="badge shrink-0 text-xs"
                    style={{
                      background: `${footfallLabel.color}18`,
                      color: footfallLabel.color,
                      border: `1px solid ${footfallLabel.color}30`,
                    }}
                  >
                    {footfallLabel.text}
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
                  { icon: Compass, label: "Footfall", value: `${selectedLocation.footfallScore}/100` },
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
                Select a radius and click <strong>Generate</strong> to discover a hidden route
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
            />
          </div>
        </div>
      </main>
    </>
  );
}
