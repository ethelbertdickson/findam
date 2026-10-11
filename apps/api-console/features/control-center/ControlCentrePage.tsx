import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  HardDrive,
  Network,
  RefreshCw,
  Server,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  loadFindamConnector,
  type FindamConnectorState,
  type IntegrationStatus,
} from './integration-api';

export function ControlCentrePage() {
  const [connector, setConnector] = useState<FindamConnectorState>({
    status: 'unconfigured',
    reason: 'Loading connector configuration…',
  });
  const [refreshing, setRefreshing] = useState(true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setConnector(await loadFindamConnector());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const snapshot = connector.status === 'connected' ? connector.snapshot : null;
  const connectorStatus: IntegrationStatus =
    connector.status === 'connected'
      ? connector.snapshot.health.status
      : connector.status === 'error'
        ? 'down'
        : 'degraded';

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Central operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Control Centre</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Product-level health and usage through removable, versioned connectors.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={refreshing} onClick={() => void refresh()}>
          <RefreshCw className={refreshing ? 'animate-spin' : ''} />
          Refresh connectors
        </Button>
      </div>

      <Card className="border-border/80 bg-card/72 shadow-none ring-0">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Network className="size-4 text-primary" />
            Product connectors
          </CardTitle>
          <CardDescription>
            Each product remains independently deployable and owns its own data.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <ConnectorTile name="Findam" status={connectorStatus} detail={connectorDetail(connector)} />
          <ConnectorTile name="MarketList" status="degraded" detail="Connector boundary ready · not registered" />
          <ConnectorTile name="Projector Pro" status="degraded" detail="Connector boundary ready · not registered" />
        </CardContent>
      </Card>

      {connector.status === 'unconfigured' ? (
        <Notice tone="warning" message={connector.reason} />
      ) : null}
      {connector.status === 'error' ? <Notice tone="danger" message={connector.message} /> : null}

      {snapshot ? (
        <>
          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Findam connector metrics">
            <MetricCard label="Findam users" value={formatNumber(snapshot.users.total)} detail={`${formatNumber(snapshot.users.active)} active`} icon={Users} />
            <MetricCard label="New users" value={formatNumber(snapshot.users.newLast7Days)} detail="Last 7 days" icon={Gauge} />
            <MetricCard label="API requests" value={formatNumber(snapshot.usage.requests)} detail={`${Math.round(snapshot.usage.windowSeconds / 60)} minute window`} icon={Server} />
            <MetricCard label="Error rate" value={`${snapshot.usage.errorRatePercent.toFixed(2)}%`} detail={`${formatNumber(snapshot.usage.errors)} errors`} icon={AlertTriangle} />
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="border-border/80 bg-card/72 shadow-none ring-0">
              <CardHeader className="border-b border-border/70 pb-4">
                <CardTitle>Findam health</CardTitle>
                <CardDescription>Reported by the Findam integration API</CardDescription>
                <CardAction><StatusBadge status={snapshot.health.status} /></CardAction>
              </CardHeader>
              <CardContent className="divide-y divide-border/70 px-0">
                <ServiceLine icon={Server} label="Application API" value={`${snapshot.health.version ?? 'version unavailable'} · ${snapshot.health.environment ?? 'environment unavailable'}`} status={snapshot.health.status} />
                <ServiceLine icon={Database} label="Database" value={snapshot.health.database ? `${snapshot.health.database.latencyMs ?? '—'} ms latency` : 'Not reported'} status={snapshot.health.database?.status ?? snapshot.health.status} />
                <ServiceLine icon={HardDrive} label="Media storage" value={storageSummary(snapshot.storage)} status={snapshot.storage.status === 'healthy' ? 'healthy' : 'degraded'} />
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/72 shadow-none ring-0">
              <CardHeader className="border-b border-border/70 pb-4">
                <CardTitle>Alerts</CardTitle>
                <CardDescription>Actionable notices from the product connector</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {snapshot.alerts.length ? snapshot.alerts.map((alert) => (
                  <div key={`${alert.code}-${alert.createdAt ?? 'current'}`} className="flex gap-3 border-b border-border/60 px-4 py-3.5 last:border-0 sm:px-5">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{alert.code} · {alert.severity}</p>
                    </div>
                  </div>
                )) : (
                  <div className="grid min-h-32 place-items-center px-5 text-center text-sm text-muted-foreground">No active alerts</div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </main>
  );
}

function ConnectorTile({ name, status, detail }: { name: string; status: IntegrationStatus; detail: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{name}</p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Users }) {
  return (
    <Card className="border-border/80 bg-card/72 shadow-none ring-0">
      <CardHeader><CardDescription>{label}</CardDescription><CardAction><div className="stat-icon stat-icon-primary"><Icon className="size-4" /></div></CardAction></CardHeader>
      <CardContent><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent>
    </Card>
  );
}

function ServiceLine({ icon: Icon, label, value, status }: { icon: typeof Server; label: string; value: string; status: IntegrationStatus }) {
  const healthy = status === 'healthy';
  return <div className="flex items-center gap-3 px-4 py-4 sm:px-5"><div className={`grid size-9 place-items-center rounded-lg ${healthy ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="truncate text-xs text-muted-foreground">{value}</p></div>{healthy ? <CheckCircle2 className="size-4 text-success" /> : <AlertTriangle className="size-4 text-warning" />}</div>;
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const className = status === 'healthy' ? 'border-success/25 bg-success/8 text-success' : status === 'down' ? 'border-destructive/25 bg-destructive/8 text-destructive' : 'border-warning/25 bg-warning/8 text-warning';
  return <Badge variant="outline" className={className}>{status === 'healthy' ? 'Healthy' : status === 'down' ? 'Down' : 'Needs setup'}</Badge>;
}

function Notice({ tone, message }: { tone: 'warning' | 'danger'; message: string }) {
  return <div className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${tone === 'danger' ? 'border-destructive/25 bg-destructive/8 text-destructive' : 'border-warning/25 bg-warning/8 text-warning'}`}><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>{message}</p></div>;
}

function connectorDetail(connector: FindamConnectorState) {
  if (connector.status === 'connected') return `${connector.snapshot.health.product} · last checked ${new Date(connector.snapshot.fetchedAt).toLocaleTimeString()}`;
  if (connector.status === 'error') return connector.message;
  return 'Connector boundary ready · setup required';
}

function storageSummary(storage: { status: string; capacity: { usedBytes: number; totalBytes: number } | null }) {
  if (!storage.capacity) return storage.status === 'configured' ? 'Configured · capacity not reported' : 'Storage capacity unavailable';
  return `${formatBytes(storage.capacity.usedBytes)} used of ${formatBytes(storage.capacity.totalBytes)}`;
}

function formatNumber(value: number) { return new Intl.NumberFormat().format(value); }
function formatBytes(value: number) { return `${(value / 1024 ** 3).toFixed(1)} GB`; }
