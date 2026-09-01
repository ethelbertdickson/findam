import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  Database,
  Loader2,
  Play,
  RefreshCw,
  Server,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/features/auth/admin-auth';
import {
  getMonitoring,
  getOperationalTaskRuns,
  runDatabaseHealthCheck,
  type MonitoringData,
  type OperationalTaskRun,
} from './admin-operations';
import type { PaginatedResponse } from '@/features/management/admin-resources';

type RecoverSession = () => Promise<boolean>;

export function MonitoringPage({
  recoverSession,
}: {
  recoverSession: RecoverSession;
}) {
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMonitoring(await getMonitoring());
    } catch (caught) {
      let requestError = caught;
      if (
        requestError instanceof ApiError &&
        requestError.status === 401 &&
        (await recoverSession())
      ) {
        try {
          setMonitoring(await getMonitoring());
          return;
        } catch (retryError) {
          requestError = retryError;
        }
      }
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [recoverSession]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            {monitoring
              ? `Updated ${formatRelativeTime(monitoring.generatedAt)}`
              : 'Collecting live telemetry'}
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            API monitoring
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real request activity from the last five minutes of this API
            process.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </section>

      {error ? (
        <FailureState message={error} onRetry={() => void load()} />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Requests"
              value={formatMetric(monitoring?.requests)}
              detail="Rolling 5-minute window"
              icon={Activity}
            />
            <MetricCard
              label="Error rate"
              value={monitoring ? `${monitoring.errorRatePercent}%` : '—'}
              detail={
                monitoring
                  ? `${monitoring.errors} request errors`
                  : 'Waiting for traffic'
              }
              icon={AlertTriangle}
              warning={Boolean(monitoring?.errors)}
            />
            <MetricCard
              label="Average latency"
              value={monitoring ? `${monitoring.averageLatencyMs} ms` : '—'}
              detail={
                monitoring
                  ? `p95 ${monitoring.p95LatencyMs} ms`
                  : 'Waiting for traffic'
              }
              icon={Clock3}
            />
            <MetricCard
              label="Requests / minute"
              value={monitoring ? String(monitoring.requestsPerMinute) : '—'}
              detail="Measured over five minutes"
              icon={Server}
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
            <Card className="border-border/80 bg-card/72 shadow-none ring-0">
              <CardHeader className="border-b border-border/70 pb-4">
                <CardTitle>Most active routes</CardTitle>
                <CardDescription>
                  Requests and error rates from live traffic
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading && !monitoring ? (
                  <LoadingBlock />
                ) : monitoring?.routes.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead>Requests</TableHead>
                        <TableHead>Latency</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monitoring.routes.map((route) => (
                        <TableRow key={`${route.method}-${route.path}`}>
                          <TableCell>
                            <Badge variant="outline" className="mr-2 font-mono">
                              {route.method}
                            </Badge>
                            <span className="font-mono text-xs">
                              {route.path}
                            </span>
                          </TableCell>
                          <TableCell>{route.requests}</TableCell>
                          <TableCell>{route.averageLatencyMs} ms</TableCell>
                          <TableCell>
                            {route.errors ? (
                              <span className="text-destructive">
                                {route.errors} ({route.errorRatePercent}%)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyTelemetry message="Route traffic will appear here as the API receives requests." />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/72 shadow-none ring-0">
              <CardHeader className="border-b border-border/70 pb-4">
                <CardTitle>Dependency checks</CardTitle>
                <CardDescription>
                  Current direct service availability
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/70 px-0">
                <DependencyRow
                  icon={Database}
                  name="PostgreSQL + PostGIS"
                  detail={
                    monitoring?.dependencies.database.latencyMs == null
                      ? 'Not connected'
                      : `${monitoring.dependencies.database.latencyMs} ms response`
                  }
                  status={
                    monitoring?.dependencies.database.status === 'healthy'
                      ? 'healthy'
                      : 'down'
                  }
                />
                <DependencyRow
                  icon={Activity}
                  name="Media provider"
                  detail={
                    monitoring?.dependencies.media.status === 'configured'
                      ? 'Configuration detected'
                      : 'Not configured yet'
                  }
                  status={
                    monitoring?.dependencies.media.status === 'configured'
                      ? 'healthy'
                      : 'planned'
                  }
                />
              </CardContent>
            </Card>
          </section>

          <section className="mt-4">
            <Card className="border-border/80 bg-card/72 shadow-none ring-0">
              <CardHeader className="border-b border-border/70 pb-4">
                <CardTitle>Recent request errors</CardTitle>
                <CardDescription>
                  Only route, status, and time are retained here—never request
                  payloads or secrets.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {monitoring?.recentErrors.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Occurred</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monitoring.recentErrors.map((entry, index) => (
                        <TableRow key={`${entry.occurredAt}-${index}`}>
                          <TableCell>
                            <Badge variant="outline" className="mr-2 font-mono">
                              {entry.method}
                            </Badge>
                            <span className="font-mono text-xs">
                              {entry.path}
                            </span>
                          </TableCell>
                          <TableCell className="text-destructive">
                            {entry.statusCode}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatRelativeTime(entry.occurredAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyTelemetry message="No request errors were observed in this process window." />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}

export function TaskRunsPage({
  recoverSession,
  csrfToken,
}: {
  recoverSession: RecoverSession;
  csrfToken: string;
}) {
  const [result, setResult] =
    useState<PaginatedResponse<OperationalTaskRun> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await getOperationalTaskRuns(page));
    } catch (caught) {
      let requestError = caught;
      if (
        requestError instanceof ApiError &&
        requestError.status === 401 &&
        (await recoverSession())
      ) {
        try {
          setResult(await getOperationalTaskRuns(page));
          return;
        } catch (retryError) {
          requestError = retryError;
        }
      }
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, recoverSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function runCheck() {
    setRunning(true);
    setError(null);
    try {
      await runDatabaseHealthCheck(csrfToken);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            Operational tasks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Run safe checks now and retain their results for operations history.
          </p>
        </div>
        <Button size="sm" disabled={running} onClick={() => void runCheck()}>
          <Play />
          {running ? 'Running check…' : 'Run database check'}
        </Button>
      </section>
      {error ? (
        <FailureState message={error} onRetry={() => void load()} />
      ) : (
        <Card className="border-border/80 bg-card/72 shadow-none ring-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle>Task run history</CardTitle>
            <CardDescription>
              Database health-check results are retained in PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading && !result ? (
              <LoadingBlock />
            ) : result?.items.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Run by</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((run) => (
                    <TableRow key={run.id ?? run.createdAt}>
                      <TableCell>
                        <p className="font-medium">Database health check</p>
                        <p className="text-xs text-muted-foreground">
                          {run.detail}
                        </p>
                      </TableCell>
                      <TableCell>
                        <TaskStatus status={run.status} />
                      </TableCell>
                      <TableCell>{run.durationMs} ms</TableCell>
                      <TableCell>
                        {run.actor
                          ? `${run.actor.firstName} ${run.actor.lastName}`
                          : 'System'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(run.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyTelemetry message="No task runs yet. Run the database check to create the first recorded result." />
            )}
            {result?.items.length ? (
              <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {result.total} recorded run{result.total === 1 ? '' : 's'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || page === 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || !result.hasNextPage}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  warning?: boolean;
}) {
  return (
    <Card className="border-border/80 bg-card/72 shadow-none ring-0">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardAction>
          <div
            className={
              warning
                ? 'stat-icon stat-icon-warning'
                : 'stat-icon stat-icon-primary'
            }
          >
            <Icon className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
function DependencyRow({
  icon: Icon,
  name,
  detail,
  status,
}: {
  icon: typeof Database;
  name: string;
  detail: string;
  status: 'healthy' | 'down' | 'planned';
}) {
  const healthy = status === 'healthy';
  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <div
        className={`grid size-9 place-items-center rounded-lg ${healthy ? 'bg-success/10 text-success' : status === 'down' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <Badge
        variant="outline"
        className={
          healthy
            ? 'border-success/25 bg-success/8 text-success'
            : status === 'down'
              ? 'border-destructive/25 bg-destructive/8 text-destructive'
              : 'border-warning/25 bg-warning/8 text-warning'
        }
      >
        {healthy ? 'Healthy' : status === 'down' ? 'Down' : 'Planned'}
      </Badge>
    </div>
  );
}
function TaskStatus({ status }: { status: OperationalTaskRun['status'] }) {
  const success = status === 'SUCCEEDED';
  return (
    <Badge
      variant="outline"
      className={
        success
          ? 'border-success/25 bg-success/8 text-success'
          : 'border-destructive/25 bg-destructive/8 text-destructive'
      }
    >
      {success ? 'Succeeded' : 'Failed'}
    </Badge>
  );
}
function LoadingBlock() {
  return (
    <div className="grid min-h-48 place-items-center">
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  );
}
function EmptyTelemetry({ message }: { message: string }) {
  return (
    <div className="grid min-h-48 place-items-center px-5 text-center">
      <div>
        <Activity className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
function FailureState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 px-6 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="mt-3 text-sm font-medium">Could not load operations data</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{message}</p>
      <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
function formatMetric(value: number | undefined) {
  return value === undefined ? '—' : value.toLocaleString();
}
function formatRelativeTime(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1_000),
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The request could not be completed.';
}
