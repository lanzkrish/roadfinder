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
import type { GeneratedLocation } from "@/store/useMapStore";

// Fix Leaflet default icon in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom green marker
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

interface MapViewProps {
  location: GeneratedLocation | null;
  center: [number, number];
  zoom: number;
}

export default function MapView({ location, center, zoom }: MapViewProps) {
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
                🌿 {location.terrainType} &nbsp;·&nbsp; 🎯 Score: {location.footfallScore}
              </span>
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
    </MapContainer>
  );
}
