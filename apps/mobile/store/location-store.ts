import { create } from "zustand";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  enabled: boolean;
  searchActive: boolean;
  setLocation: (latitude: number, longitude: number) => void;
  setRadius: (radiusKm: number) => void;
  enableSearch: () => void;
  disableSearch: () => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  radiusKm: 10,
  enabled: false,
  searchActive: false,
  setLocation: (latitude, longitude) =>
    set({ latitude, longitude, enabled: true, searchActive: true }),
  setRadius: (radiusKm) => set({ radiusKm }),
  enableSearch: () => set({ searchActive: true }),
  disableSearch: () => set({ searchActive: false }),
  clear: () =>
    set({ latitude: null, longitude: null, enabled: false, searchActive: false }),
}));
