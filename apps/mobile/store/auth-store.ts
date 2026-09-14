import { create } from "zustand";
import { SECURE_STORE_KEYS } from "../constants";
import type { AuthTokens, User } from "../types";
import { deleteToken, getToken, setToken } from "../services/token-storage";

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
    const accessToken = await getToken(SECURE_STORE_KEYS.accessToken);
    set({ accessToken, isHydrated: true });
  },

  setSession: async ({ user, accessToken, refreshToken }) => {
    await setToken(SECURE_STORE_KEYS.accessToken, accessToken);
    await setToken(SECURE_STORE_KEYS.refreshToken, refreshToken);
    set({ user, accessToken });
  },

  setUser: (user) => set({ user }),

  clearSession: async () => {
    await deleteToken(SECURE_STORE_KEYS.accessToken);
    await deleteToken(SECURE_STORE_KEYS.refreshToken);
    set({ user: null, accessToken: null });
  },
}));

export function getStoredRefreshToken() {
  return getToken(SECURE_STORE_KEYS.refreshToken);
}
