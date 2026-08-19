export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

export const COLORS = {
  primary: "#2F81F7",
  primaryDark: "#1F6FEB",
  background: "#0D1117",
  surface: "#161B22",
  surfaceElevated: "#21262D",
  text: "#FFFFFF",
  muted: "#C9D1D9",
  border: "#30363D",
  danger: "#EF4444",
  success: "#22C55E",
};

export const SECURE_STORE_KEYS = {
  accessToken: "findam.accessToken",
  refreshToken: "findam.refreshToken",
};
