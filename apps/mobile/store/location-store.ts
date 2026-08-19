import { create } from 'zustand';

interface LocationState { latitude: number | null; longitude: number | null; radiusKm: number; setLocation: (latitude: number, longitude: number) => void; setRadius: (radiusKm: number) => void; clear: () => void }
export const useLocationStore = create<LocationState>((set) => ({ latitude: null, longitude: null, radiusKm: 10, setLocation: (latitude, longitude) => set({ latitude, longitude }), setRadius: (radiusKm) => set({ radiusKm }), clear: () => set({ latitude: null, longitude: null }) }));
