import * as authService from "../services/auth";
import { getStoredRefreshToken, useAuthStore } from "../store/auth-store";

// Thin convenience hook; keeps components decoupled from the store's shape.
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const clearSession = useAuthStore((state) => state.clearSession);

  const logout = async () => {
    const refreshToken = await getStoredRefreshToken();
    if (refreshToken) {
      await authService.logout(refreshToken).catch(() => undefined);
    }
    await clearSession();
  };

  return {
    user,
    isAuthenticated: Boolean(accessToken),
    isHydrated,
    logout,
  };
}
