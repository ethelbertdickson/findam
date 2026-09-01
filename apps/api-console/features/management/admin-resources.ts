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

export function getManagedListings(filters: ListingsFilters) {
  return apiRequest<PaginatedResponse<ManagedListing>>(
    `/admin/listings?${toQueryString(filters)}`,
  );
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
