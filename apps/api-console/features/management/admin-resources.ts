import { apiRequest } from '@/features/auth/admin-auth';

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export interface ManagedUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'USER' | 'AGENT' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  agentProfile: {
    agencyName: string | null;
    isVerified: boolean;
  } | null;
  _count: { listings: number };
}
export interface ManagedUserDetails extends ManagedUser {
  projectorProTrialAvailable: boolean;
  projectorProWallet: {
    balanceSeconds: number;
    trialGrantedAt: string | null;
    entries: Array<{
      id: string;
      type: string;
      seconds: number;
      description: string;
      createdAt: string;
    }> | null;
  } | null;
  projectorProPurchases: Array<{
    packageCode: string;
    creditSeconds: number;
    status: string;
    createdAt: string;
    fulfilledAt: string | null;
  }>;
  projectorProSessions: Array<{
    id: string;
    installationId: string;
    reservedSeconds: number;
    consumedSeconds: number;
    status: string;
    createdAt: string;
    lastHeartbeatAt: string | null;
    completedAt: string | null;
  }>;
  projectorProTrialDevices: Array<{ deviceId: string; grantedAt: string }>;
  refreshTokens: Array<{
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
  }>;
}

export interface ManagedListing {
  id: string;
  title: string;
  type: 'PROPERTY' | 'LAND' | 'HOUSEHOLD';
  status:
    | 'DRAFT'
    | 'PENDING'
    | 'ACTIVE'
    | 'RENTED'
    | 'SOLD'
    | 'EXPIRED'
    | 'REJECTED'
    | 'ARCHIVED';
  price: string;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  city: { name: string };
  state: { name: string };
}

export type ListingModerationAction = 'APPROVE' | 'REJECT' | 'ARCHIVE';

export type AdminAuditAction =
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED'
  | 'LISTING_ARCHIVED';

export interface AdminAuditLog {
  id: string;
  action: AdminAuditAction;
  targetType: 'USER' | 'LISTING';
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface UsersFilters {
  q: string;
  role: string;
  status: string;
  page: number;
}

export interface ListingsFilters {
  q: string;
  type: string;
  status: string;
  page: number;
}

export function getManagedUsers(filters: UsersFilters) {
  return apiRequest<PaginatedResponse<ManagedUser>>(
    `/admin/users?${toQueryString(filters)}`,
  );
}
export function getManagedUserDetails(id: string) {
  return apiRequest<ManagedUserDetails>(`/admin/users/${id}`);
}

export function getManagedListings(filters: ListingsFilters) {
  return apiRequest<PaginatedResponse<ManagedListing>>(
    `/admin/listings?${toQueryString(filters)}`,
  );
}

export interface ProjectorProDownloadReport {
  summary: Array<{ status: string; _count: { _all: number } }>;
  byPlatform: Array<{ platform: string | null; status: string; _count: { _all: number } }>;
  byCountry: Array<{ countryCode: string | null; continent: string | null; _count: { _all: number } }>;
  recent: Array<{ id: string; version: string; platform: string | null; status: string; ipHash: string | null; countryCode: string | null; continent: string | null; region: string | null; startedAt: string; completedAt: string | null }>;
}

export function getProjectorProDownloads(limit = 50) {
  return apiRequest<ProjectorProDownloadReport>(`/admin/downloads/projectorpro?limit=${limit}`);
}

export function uploadAppRelease(app: string, platform: string, file: File, csrfToken: string) {
  const body = new FormData();
  body.append('file', file);
  return apiRequest<{ app: string; platform: string; filename: string; sizeBytes: number }>(`/admin/downloads/${encodeURIComponent(app)}/${encodeURIComponent(platform)}/upload`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body,
  });
}

export function updateManagedUserStatus(
  userId: string,
  isActive: boolean,
  csrfToken: string,
) {
  return apiRequest<{ id: string; isActive: boolean; unchanged: boolean }>(
    `/admin/users/${userId}/status`,
    {
      method: 'PATCH',
      headers: { 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ isActive }),
    },
  );
}

export function moderateManagedListing(
  listingId: string,
  action: ListingModerationAction,
  csrfToken: string,
) {
  return apiRequest<{ id: string; status: string; unchanged: boolean }>(
    `/admin/listings/${listingId}/moderation`,
    {
      method: 'PATCH',
      headers: { 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ action }),
    },
  );
}

export function getAdminAuditLog(filters: { action: string; page: number }) {
  return apiRequest<PaginatedResponse<AdminAuditLog>>(
    `/admin/audit?${toQueryString({ ...filters, limit: 20 })}`,
  );
}

function toQueryString(filters: object) {
  const params = new URLSearchParams({ limit: '20' });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '') params.set(key, String(value));
  }
  return params.toString();
}
