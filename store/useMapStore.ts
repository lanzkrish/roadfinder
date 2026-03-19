"use client";

import { create } from "zustand";

export interface GeneratedLocation {
  lat: number;
  lng: number;
  distanceKm: number;
  terrainType: string;
  footfallScore: number;
  roadType: string;
}

interface MapState {
  selectedLocation: GeneratedLocation | null;
  mapCenter: [number, number];
  zoom: number;
  selectedRadius: 20 | 50 | 100;
  isGenerating: boolean;

  setSelectedLocation: (loc: GeneratedLocation | null) => void;
  setMapCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setSelectedRadius: (radius: 20 | 50 | 100) => void;
  setIsGenerating: (val: boolean) => void;
  clearLocation: () => void;
}

export const useMapStore = create<MapState>()((set) => ({
  selectedLocation: null,
  mapCenter: [20.5937, 78.9629], // India center default
  zoom: 5,
  selectedRadius: 50,
  isGenerating: false,

  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedRadius: (selectedRadius) => set({ selectedRadius }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  clearLocation: () => set({ selectedLocation: null }),
}));
