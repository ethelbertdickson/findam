import { apiClient } from "./api";
import type { AuthResult, AuthTokens, User } from "../types";

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: "USER" | "AGENT";
}

interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput) {
  const { data } = await apiClient.post<AuthResult>("/auth/register", input);
  return data;
}

export async function login(input: LoginInput) {
  const { data } = await apiClient.post<AuthResult>("/auth/login", input);
  return data;
}

export async function google(idToken: string) {
  const { data } = await apiClient.post<AuthResult>("/auth/google", {
    idToken,
  });
  return data;
}

export async function refresh(refreshToken: string) {
  const { data } = await apiClient.post<AuthTokens>("/auth/refresh", {
    refreshToken,
  });
  return data;
}

export async function logout(refreshToken: string) {
  await apiClient.post("/auth/logout", { refreshToken });
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function updateProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}) {
  const { data } = await apiClient.patch<User>("/auth/me", input);
  return data;
}
export async function requestPasswordReset(email: string) {
  const { data } = await apiClient.post<{
    message: string;
    developmentToken?: string;
  }>("/auth/password-reset/request", { email });
  return data;
}
export async function confirmPasswordReset(token: string, password: string) {
  const { data } = await apiClient.post("/auth/password-reset/confirm", {
    token,
    password,
  });
  return data;
}
