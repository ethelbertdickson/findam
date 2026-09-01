import { apiRequest } from '@/features/auth/admin-auth';
import type { PaginatedResponse } from '@/features/management/admin-resources';

export interface MonitoringData {
  generatedAt: string;
  windowSeconds: number;
  processStartedAt: string;
  requests: number;
  errors: number;
  errorRatePercent: number;
  requestsPerMinute: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  statusCodes: Record<string, number>;
  routes: Array<{
    method: string;
    path: string;
    requests: number;
    errors: number;
    totalDurationMs: number;
    averageLatencyMs: number;
    errorRatePercent: number;
  }>;
  recentErrors: Array<{
    method: string;
    path: string;
    statusCode: number;
    occurredAt: string;
  }>;
  dependencies: {
    database: { status: 'healthy' | 'down'; latencyMs: number | null };
    media: { status: 'configured' | 'not_configured' };
  };
}

export interface OperationalTaskRun {
  id: string | null;
  task: 'DATABASE_HEALTH_CHECK';
  status: 'SUCCEEDED' | 'FAILED';
  durationMs: number;
  detail: string;
  createdAt: string;
  actor?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function getMonitoring() {
  return apiRequest<MonitoringData>('/admin/monitoring');
}

export function getOperationalTaskRuns(page: number) {
  return apiRequest<PaginatedResponse<OperationalTaskRun>>(
    `/admin/tasks/runs?page=${page}&limit=20`,
  );
}

export function runDatabaseHealthCheck(csrfToken: string) {
  return apiRequest<OperationalTaskRun>('/admin/tasks/database-health-check', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}
