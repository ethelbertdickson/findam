export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role: 'ADMIN';
  isActive: boolean;
}

export interface AdminSession {
  user: AdminUser;
  csrfToken: string;
}

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const API_URL = configuredApiUrl || '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let message = 'The request could not be completed.';
    try {
      const body = (await response.json()) as {
        message?: string | string[];
        error?: string;
      };
      message = Array.isArray(body.message)
        ? body.message.join(' ')
        : body.message || body.error || message;
    } catch {
      // Keep the generic message when the server did not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function loginAdmin(email: string, password: string) {
  return apiRequest<AdminSession>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getAdminSession() {
  return apiRequest<AdminSession>('/admin/auth/session');
}

export function getCsrfToken() {
  return apiRequest<{ csrfToken: string }>('/admin/auth/csrf');
}

export function refreshAdminSession(csrfToken: string) {
  return apiRequest<AdminSession>('/admin/auth/refresh', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}

export function logoutAdmin(csrfToken: string) {
  return apiRequest<void>('/admin/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}

export async function restoreAdminSession(): Promise<AdminSession | null> {
  try {
    return await getAdminSession();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
  }

  const { csrfToken } = await getCsrfToken();
  try {
    return await refreshAdminSession(csrfToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
