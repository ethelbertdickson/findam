import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

type ProductId = 'findam' | 'marketlist' | 'projectorpro';
type ConnectorStatus = 'healthy' | 'degraded' | 'down' | 'not_configured';

interface ConnectorConfig {
  id: ProductId;
  name: string;
  url?: string;
  key?: string;
}

interface ProductSnapshot {
  id: ProductId;
  name: string;
  status: ConnectorStatus;
  fetchedAt: string;
  health?: unknown;
  users?: unknown;
  storage?: unknown;
  usage?: unknown;
  alerts?: unknown;
  error?: string;
}

const port = Number(process.env.CONTROL_CENTRE_PORT ?? 3400);
const controlToken = process.env.CONTROL_CENTRE_TOKEN;
const connectors: ConnectorConfig[] = [
  {
    id: 'findam',
    name: 'Findam',
    url: process.env.FINDAM_INTEGRATION_URL,
    key: process.env.FINDAM_INTEGRATION_KEY,
  },
  {
    id: 'marketlist',
    name: 'MarketList',
    url: process.env.MARKETLIST_INTEGRATION_URL,
    key: process.env.MARKETLIST_INTEGRATION_KEY,
  },
  {
    id: 'projectorpro',
    name: 'Projector Pro',
    url: process.env.PROJECTOR_PRO_INTEGRATION_URL,
    key: process.env.PROJECTOR_PRO_INTEGRATION_KEY,
  },
];

const paths = {
  health: '/health',
  users: '/metrics/users',
  storage: '/metrics/storage',
  usage: '/metrics/usage',
  alerts: '/alerts',
} as const;

const server = createServer(async (request, response) => {
  setJsonHeaders(response);

  if (request.method !== 'GET') {
    send(response, 405, { error: 'method_not_allowed' });
    return;
  }

  if (request.url === paths.health) {
    send(response, 200, { status: 'ok', service: 'control-center' });
    return;
  }

  if (request.url !== '/api/v1/control/products') {
    send(response, 404, { error: 'not_found' });
    return;
  }

  const localProxyRequest = request.socket.remoteAddress === '127.0.0.1' || request.socket.remoteAddress === '::1' || request.socket.remoteAddress === '::ffff:127.0.0.1';
  if (controlToken && !localProxyRequest && request.headers['x-control-token'] !== controlToken) {
    send(response, 401, { error: 'unauthorized' });
    return;
  }

  const products = await Promise.all(connectors.map(loadConnector));
  send(response, 200, {
    generatedAt: new Date().toISOString(),
    products,
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Control Centre listening on http://127.0.0.1:${port}`);
});

async function loadConnector(config: ConnectorConfig): Promise<ProductSnapshot> {
  const fetchedAt = new Date().toISOString();
  if (!config.url || !config.key) {
    return {
      id: config.id,
      name: config.name,
      status: 'not_configured',
      fetchedAt,
      error: 'Connector credentials are not configured.',
    };
  }

  try {
    const [health, users, storage, usage, alerts] = await Promise.all([
      connectorGet(config, paths.health),
      connectorGet(config, paths.users),
      connectorGet(config, paths.storage),
      connectorGet(config, paths.usage),
      connectorGet(config, paths.alerts),
    ]);
    const healthStatus = readStatus(health) === 'healthy' ? 'healthy' : 'degraded';
    return { id: config.id, name: config.name, status: healthStatus, fetchedAt, health, users, storage, usage, alerts };
  } catch (error) {
    return {
      id: config.id,
      name: config.name,
      status: 'down',
      fetchedAt,
      error: error instanceof Error ? error.message : 'Connector request failed.',
    };
  }
}

async function connectorGet(config: ConnectorConfig, path: string): Promise<unknown> {
  const response = await fetch(`${config.url!.replace(/\/$/, '')}${path}`, {
    headers: { accept: 'application/json', 'x-integration-key': config.key! },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Connector returned HTTP ${response.status}.`);
  return response.json();
}

function readStatus(value: unknown): string {
  if (typeof value !== 'object' || value === null || !('status' in value)) return 'degraded';
  const status = value.status;
  return typeof status === 'string' ? status : 'degraded';
}

function setJsonHeaders(response: ServerResponse) {
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.end(JSON.stringify(body));
}
