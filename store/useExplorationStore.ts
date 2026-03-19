"use client";

import { create } from "zustand";

export interface SavedLocation {
  _id: string;
  coordinates: { lat: number; lng: number };
  distanceKm: number;
  terrainType: string;
  footfallScore: number;
  notes: string;
  imageUrl: string;
  dateExplored: string;
}

interface ExplorationState {
  savedLocations: SavedLocation[];
  isSaving: boolean;
  isLoadingList: boolean;
  lastFetchedAt: number | null;

  setSavedLocations: (locs: SavedLocation[]) => void;
  addSavedLocation: (loc: SavedLocation) => void;
  setIsSaving: (val: boolean) => void;
  setIsLoadingList: (val: boolean) => void;
  setLastFetchedAt: (ts: number) => void;
  clearExploration: () => void;
}

export const useExplorationStore = create<ExplorationState>()((set) => ({
  savedLocations: [],
  isSaving: false,
  isLoadingList: false,
  lastFetchedAt: null,

  setSavedLocations: (savedLocations) => set({ savedLocations, lastFetchedAt: Date.now() }),
  addSavedLocation: (loc) =>
    set((s) => ({ savedLocations: [loc, ...s.savedLocations] })),
  setIsSaving: (isSaving) => set({ isSaving }),
  setIsLoadingList: (isLoadingList) => set({ isLoadingList }),
  setLastFetchedAt: (lastFetchedAt) => set({ lastFetchedAt }),
  clearExploration: () => set({ savedLocations: [], lastFetchedAt: null }),
}));
