import { ApiError } from '@/features/auth/admin-auth';

const API_URL = '/api/v1/admin/media';

export interface MediaFolder {
  id: string;
  name: string;
  path: string;
  _count: { assets: number };
}

export interface MediaApiKey {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface MediaProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { folders: number; assets: number };
  apiKeys: MediaApiKey[];
}

export interface CreatedMediaApiKey extends MediaApiKey {
  key: string;
}

export interface MediaAsset {
  id: string;
  originalFilename: string;
  mimeType: string;
  kind: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
  sizeBytes: number;
  urlPath: string;
  createdAt: string;
  folder: { id: string; name: string; path: string } | null;
}

export interface MediaAssetPage {
  items: MediaAsset[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export async function getMediaProjects() {
  return mediaRequest<MediaProject[]>('/projects');
}

export function createMediaProject(
  values: { name: string; slug?: string; description?: string },
  csrfToken: string,
) {
  return mediaRequest<MediaProject>('/projects', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(values),
  });
}

export function createProjectApiKey(
  projectId: string,
  name: string,
  csrfToken: string,
) {
  return mediaRequest<CreatedMediaApiKey>(`/projects/${projectId}/keys`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ name }),
  });
}

export function revokeProjectApiKey(
  projectId: string,
  keyId: string,
  csrfToken: string,
) {
  return mediaRequest<{ revoked: true }>(
    `/projects/${projectId}/keys/${keyId}/revoke`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    },
  );
}

export async function getMediaFolders(projectSlug: string) {
  const params = new URLSearchParams({ projectSlug });
  return mediaRequest<MediaFolder[]>(`/folders?${params}`);
}

export async function getMediaAssets(filters: {
  projectSlug: string;
  q: string;
  folderPath: string;
}) {
  const params = new URLSearchParams({
    page: '1',
    limit: '30',
    projectSlug: filters.projectSlug,
  });
  if (filters.q) params.set('q', filters.q);
  if (filters.folderPath) params.set('folderPath', filters.folderPath);
  return mediaRequest<MediaAssetPage>(`/assets?${params}`);
}

export function createMediaFolder(
  name: string,
  parentPath: string,
  projectSlug: string,
  csrfToken: string,
) {
  return mediaRequest<MediaFolder>('/folders', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({
      name,
      projectSlug,
      ...(parentPath ? { parentPath } : {}),
    }),
  });
}

export function uploadMediaAsset(
  file: File,
  folderPath: string,
  projectSlug: string,
  csrfToken: string,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectSlug', projectSlug);
  if (folderPath) formData.append('folderPath', folderPath);
  return mediaRequest<MediaAsset>('/assets', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: formData,
  });
}

async function mediaRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    let message = 'The media request could not be completed.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(body.message)
        ? body.message.join(' ')
        : body.message || message;
    } catch {
      /* keep generic message */
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}
