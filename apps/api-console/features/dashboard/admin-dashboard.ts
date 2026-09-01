import { apiRequest } from '@/features/auth/admin-auth';

export interface AdminDashboardData {
  generatedAt: string;
  api: {
    status: 'healthy' | 'degraded';
    uptimeSeconds: number;
    environment: string;
    version: string;
  };
  database: {
    status: 'healthy' | 'down';
    latencyMs: number | null;
  };
  marketplace: {
    usersTotal: number;
    usersActive: number;
    agentsTotal: number;
    listingsTotal: number;
    listingsActive: number;
    newUsersSevenDays: number;
    newListingsSevenDays: number;
  } | null;
  recentActivity: Array<{
    id: string;
    kind: 'USER_REGISTERED' | 'LISTING_CREATED';
    title: string;
    detail: string;
    occurredAt: string;
  }>;
}

export function getAdminDashboard() {
  return apiRequest<AdminDashboardData>('/admin/dashboard');
}
