"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeneratedLocation, Facility } from "@/store/useMapStore";

// Fix Leaflet default icon in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom green marker for the main location
const greenIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" fill="none">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="#2D6A4F"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`),
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -44],
});

// Facility marker colors
const FACILITY_COLORS: Record<string, { fill: string; emoji: string; label: string }> = {
  hospital: { fill: "#DC2626", emoji: "🏥", label: "Hospital" },
  police: { fill: "#2563EB", emoji: "🚔", label: "Police Station" },
  railway_station: { fill: "#EA580C", emoji: "🚉", label: "Railway Station" },
  bus_stop: { fill: "#7C3AED", emoji: "🚌", label: "Bus Stop" },
};

function createFacilityIcon(type: string): L.Icon {
  const color = FACILITY_COLORS[type]?.fill ?? "#6B7280";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" fill="none">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
  </svg>`;
  return new L.Icon({
    iconUrl: "data:image/svg+xml;base64," + btoa(svg),
    iconSize: [22, 33],
    iconAnchor: [11, 33],
    popupAnchor: [0, -35],
  });
}

interface MapViewProps {
  location: GeneratedLocation | null;
  center: [number, number];
  zoom: number;
  facilities?: Facility[];
}

export default function MapView({ location, center, zoom, facilities = [] }: MapViewProps) {
  // Suppress SSR warning — this component is always loaded dynamically
  useEffect(() => {}, []);

  return (
    <MapContainer
      key={location ? `${location.lat}-${location.lng}` : "default-map"}
      center={location ? [location.lat, location.lng] : center}
      zoom={location ? 13 : zoom}
      style={{ height: "100%", width: "100%", borderRadius: 14 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />

      {/* Main location marker */}
      {location && (
        <Marker position={[location.lat, location.lng]} icon={greenIcon}>
          <Popup>
            <div style={{ fontFamily: "Inter, sans-serif", minWidth: 180 }}>
              <strong style={{ color: "#2D6A4F" }}>Hidden Spot Found</strong>
              <br />
              <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </span>
              <br />
              <span style={{ fontSize: "0.85rem" }}>
                🌿 {location.terrainType} &nbsp;·&nbsp; 🎯 Carpe Terra: {location.carpeTerraScore}
              </span>
              {location.altitude !== null && (
                <>
                  <br />
                  <span style={{ fontSize: "0.85rem" }}>
                    ⛰️ Altitude: {location.altitude}m
                  </span>
                </>
              )}
              <br />
              <a
                href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2D6A4F", fontSize: "0.82rem", fontWeight: 600 }}
              >
                Open in Google Maps ↗
              </a>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Facility markers */}
      {facilities.map((f) => {
        const meta = FACILITY_COLORS[f.type];
        if (!meta) return null;
        return (
          <Marker
            key={`${f.type}-${f.lat}-${f.lng}`}
            position={[f.lat, f.lng]}
            icon={createFacilityIcon(f.type)}
          >
            <Popup>
              <div style={{ fontFamily: "Inter, sans-serif", minWidth: 160 }}>
                <strong style={{ color: meta.fill }}>
                  {meta.emoji} {meta.label}
                </strong>
                <br />
                <span style={{ fontSize: "0.85rem" }}>{f.name}</span>
                <br />
                <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                  📍 {f.distanceKm} km from location
                </span>
                <br />
                <a
                  href={`https://www.google.com/maps?q=${f.lat},${f.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: meta.fill, fontSize: "0.82rem", fontWeight: 600 }}
                >
                  Directions ↗
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
