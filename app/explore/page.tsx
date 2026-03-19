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
    try {
      const res = await fetch(`/api/generate-location?radius=${selectedRadius}`);
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
      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          minHeight: "calc(100vh - 64px)",
          gap: 0,
        }}
        className="lg:grid-cols-[380px_1fr] flex flex-col"
      >
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside
          style={{
            background: "var(--white)",
            borderRight: "1px solid var(--border)",
            padding: "28px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Header */}
          <div>
            <h1 style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: 4 }}>
              Route Generator
            </h1>
            <p style={{ color: "var(--ink-muted)", fontSize: "0.875rem" }}>
              Discover hidden roads near you
            </p>
          </div>

          {/* Radius selector */}
          <div>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 10 }}>
              Search Radius
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {([20, 50, 100] as const).map((r) => (
                <button
                  key={r}
                  id={`radius-${r}`}
                  onClick={() => setSelectedRadius(r)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `2px solid ${selectedRadius === r ? "var(--green)" : "var(--border)"}`,
                    background: selectedRadius === r ? "var(--green-mist)" : "transparent",
                    color: selectedRadius === r ? "var(--green-dark)" : "var(--ink-muted)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
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
            className="btn-primary"
            style={{ justifyContent: "center", width: "100%" }}
          >
            {isGenerating ? (
              <>
                <span
                  className="animate-spin"
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    display: "inline-block",
                  }}
                />
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 10,
                padding: "12px 14px",
                color: "#991B1B",
                fontSize: "0.85rem",
              }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Save success */}
          {saveSuccess && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--green-mist)",
                border: "1px solid var(--green-light)",
                borderRadius: 10,
                padding: "12px 14px",
                color: "var(--green-dark)",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              ✓ Location saved to your log!
            </div>
          )}

          {/* Result card */}
          {selectedLocation && (
            <div
              className="animate-fade-up"
              style={{
                background: "var(--cream)",
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Location Found</span>
                {footfallLabel && (
                  <span
                    className="badge"
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                <Navigation size={13} color="var(--sky-dark)" />
                <span style={{ fontFamily: "monospace" }}>
                  {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </span>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { icon: Map, label: "Distance", value: `${selectedLocation.distanceKm} km` },
                  { icon: TreePine, label: "Terrain", value: selectedLocation.terrainType },
                  { icon: Info, label: "Road Type", value: selectedLocation.roadType },
                  {
                    icon: Compass,
                    label: "Footfall Score",
                    value: `${selectedLocation.footfallScore}/100`,
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--white)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--ink-muted)", fontSize: "0.75rem", marginBottom: 4 }}>
                      <Icon size={11} />
                      {label}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--ink)" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
                >
                  <ExternalLink size={14} />
                  Google Maps
                </a>
                <button
                  id="save-location-btn"
                  onClick={() => setShowSaveForm(!showSaveForm)}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Bookmark size={14} />
                  Save
                </button>
              </div>

              {/* Save form */}
              {showSaveForm && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea
                    ref={saveNoteRef}
                    placeholder="Add notes about this location (optional)…"
                    value={saveNote}
                    onChange={(e) => setSaveNote(e.target.value)}
                    className="input-field"
                    style={{ minHeight: 80, resize: "vertical" }}
                    maxLength={2000}
                  />
                  <button
                    id="confirm-save-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary"
                    style={{ justifyContent: "center" }}
                  >
                    {isSaving ? "Saving…" : "Confirm Save"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!selectedLocation && !isGenerating && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                textAlign: "center",
                gap: 12,
                color: "var(--ink-muted)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: "var(--green-mist)",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Map size={30} color="var(--green)" />
              </div>
              <p style={{ fontSize: "0.9rem", maxWidth: 220 }}>
                Select a radius and click <strong>Generate</strong> to discover a hidden route
              </p>
              <Link href="/dashboard" style={{ color: "var(--green)", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
                View saved locations →
              </Link>
            </div>
          )}
        </aside>

        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <div style={{ position: "relative", minHeight: 500 }}>
          <MapView
            location={selectedLocation}
            center={mapCenter}
            zoom={zoom}
          />
        </div>
      </main>
    </>
  );
}
