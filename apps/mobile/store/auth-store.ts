import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { SECURE_STORE_KEYS } from "../constants";
import type { AuthTokens, User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (params: { user: User } & AuthTokens) => Promise<void>;
  setUser: (user: User) => void;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrated: false,

  hydrate: async () => {
    const accessToken = await SecureStore.getItemAsync(
      SECURE_STORE_KEYS.accessToken,
    );
    set({ accessToken, isHydrated: true });
  },

  setSession: async ({ user, accessToken, refreshToken }) => {
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.accessToken, accessToken);
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.refreshToken,
      refreshToken,
    );
    set({ user, accessToken });
  },

  setUser: (user) => set({ user }),

  clearSession: async () => {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.accessToken);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.refreshToken);
    set({ user: null, accessToken: null });
  },
}));

export function getStoredRefreshToken() {
  return SecureStore.getItemAsync(SECURE_STORE_KEYS.refreshToken);
}
