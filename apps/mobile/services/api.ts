import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_URL, SECURE_STORE_KEYS } from "../constants";
import { getStoredRefreshToken, useAuthStore } from "../store/auth-store";
import type { AuthTokens } from "../types";

// The mobile app talks only to the NestJS REST API; it never touches PostgreSQL directly.
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const accessToken = await SecureStore.getItemAsync(
    SECURE_STORE_KEYS.accessToken,
  );
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Ensures concurrent 401s only trigger a single refresh call.
let pendingRefresh: Promise<AuthTokens> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = String(originalRequest?.url).includes("/auth/");

    if (
      error.response?.status !== 401 ||
      isAuthEndpoint ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    const refreshToken = await getStoredRefreshToken();
    if (!refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      pendingRefresh ??= axios
        .post<AuthTokens>(`${API_URL}/auth/refresh`, { refreshToken })
        .then((res) => res.data)
        .finally(() => {
          pendingRefresh = null;
        });

      const tokens = await pendingRefresh;
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        await useAuthStore
          .getState()
          .setSession({ user: currentUser, ...tokens });
      }

      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      await useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
  },
);
