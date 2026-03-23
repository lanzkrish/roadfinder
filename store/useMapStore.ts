"use client";

import { create } from "zustand";

export type TerrainFilter = "hill" | "forest" | "lake" | "beach" | "straight_road";
export type RoadFilter = "paved" | "unpaved" | "trekking";

export interface Facility {
  type: "hospital" | "police" | "railway_station" | "bus_stop";
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

export interface GeneratedLocation {
  lat: number;
  lng: number;
  distanceKm: number;
  terrainType: string;
  carpeTerraScore: number;
  /** @deprecated Use carpeTerraScore — kept for backward compat */
  footfallScore: number;
  roadType: string;
  isRemote: boolean;
  altitude: number | null;
}

const ALL_TERRAINS: TerrainFilter[] = ["hill", "forest", "lake", "beach", "straight_road"];

interface MapState {
  selectedLocation: GeneratedLocation | null;
  mapCenter: [number, number];
  zoom: number;
  selectedRadius: 20 | 50 | 100;
  isGenerating: boolean;

  // Filters
  selectedTerrains: Set<TerrainFilter>;
  selectedRoadType: RoadFilter | "all";

  // Facilities
  nearbyFacilities: Facility[];

  setSelectedLocation: (loc: GeneratedLocation | null) => void;
  setMapCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setSelectedRadius: (radius: 20 | 50 | 100) => void;
  setIsGenerating: (val: boolean) => void;
  clearLocation: () => void;

  toggleTerrain: (terrain: TerrainFilter) => void;
  selectAllTerrains: () => void;
  setSelectedRoadType: (road: RoadFilter | "all") => void;
  setNearbyFacilities: (facilities: Facility[]) => void;
}

export const useMapStore = create<MapState>()((set) => ({
  selectedLocation: null,
  mapCenter: [20.5937, 78.9629], // India center default
  zoom: 5,
  selectedRadius: 50,
  isGenerating: false,

  selectedTerrains: new Set<TerrainFilter>(),
  selectedRoadType: "all",
  nearbyFacilities: [],

  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedRadius: (selectedRadius) => set({ selectedRadius }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  clearLocation: () => set({ selectedLocation: null, nearbyFacilities: [] }),

  toggleTerrain: (terrain) =>
    set((s) => {
      const next = new Set(s.selectedTerrains);
      if (next.has(terrain)) {
        next.delete(terrain);
      } else {
        next.add(terrain);
      }
      // If all 5 are selected, reset to empty (= "All")
      if (next.size === ALL_TERRAINS.length) {
        return { selectedTerrains: new Set<TerrainFilter>() };
      }
      return { selectedTerrains: next };
    }),

  selectAllTerrains: () => set({ selectedTerrains: new Set<TerrainFilter>() }),

  setSelectedRoadType: (selectedRoadType) => set({ selectedRoadType }),
  setNearbyFacilities: (nearbyFacilities) => set({ nearbyFacilities }),
}));
