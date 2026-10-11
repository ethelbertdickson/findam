export type IntegrationStatus = 'healthy' | 'degraded' | 'down';

export interface IntegrationHealth {
  product: string;
  status: IntegrationStatus;
  version?: string;
  environment?: string;
  generatedAt: string;
  database?: { status: IntegrationStatus; latencyMs: number | null };
}

export interface IntegrationUsers {
  product: string;
  total: number;
  active: number;
  newLast7Days: number;
  generatedAt: string;
}

export interface IntegrationStorage {
  product: string;
  provider: string | null;
  status: 'configured' | 'healthy' | 'unavailable';
  capacity: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
  } | null;
  generatedAt: string;
}

export interface IntegrationUsage {
  product: string;
  requests: number;
  errors: number;
  errorRatePercent: number;
  averageLatencyMs: number;
  windowSeconds: number;
  generatedAt: string;
}

export interface IntegrationAlert {
  severity: 'info' | 'warning' | 'critical';
  code: string;
  message: string;
  createdAt?: string;
}

interface IntegrationAlertsResponse {
  alerts: IntegrationAlert[];
}

export interface FindamIntegrationSnapshot {
  health: IntegrationHealth;
  users: IntegrationUsers;
  storage: IntegrationStorage;
  usage: IntegrationUsage;
  alerts: IntegrationAlert[];
  fetchedAt: string;
}

export type FindamConnectorState =
  | { status: 'unconfigured'; reason: string }
  | { status: 'connected'; snapshot: FindamIntegrationSnapshot }
  | { status: 'error'; message: string };

const configuredUrl = import.meta.env.VITE_FINDAM_INTEGRATION_URL?.replace(/\/$/, '');
const configuredKey = import.meta.env.VITE_FINDAM_INTEGRATION_KEY;

function endpoint(path: string) {
  return `${configuredUrl}${path}`;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(endpoint(path), {
    headers: {
      Accept: 'application/json',
      'x-integration-key': configuredKey ?? '',
    },
  });
  if (!response.ok) {
    throw new Error(`Findam connector returned HTTP ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export async function loadFindamConnector(): Promise<FindamConnectorState> {
  if (!configuredUrl || !configuredKey) {
    return {
      status: 'unconfigured',
      reason:
        'This browser console has no connector configured. Production Control Centre connectors must run server-side so integration keys are never exposed to users.',
    };
  }

  try {
    const [health, users, storage, usage, alertsResponse] = await Promise.all([
      get<IntegrationHealth>('/health'),
      get<IntegrationUsers>('/metrics/users'),
      get<IntegrationStorage>('/metrics/storage'),
      get<IntegrationUsage>('/metrics/usage'),
      get<IntegrationAlertsResponse>('/alerts'),
    ]);

    return {
      status: 'connected',
      snapshot: {
        health,
        users,
        storage,
        usage,
        alerts: alertsResponse.alerts,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'The Findam connector could not be reached.',
    };
  }
}
