import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  FolderKanban,
  House,
  Image,
  LayoutDashboard,
  ListTodo,
  Loader2,
  LogOut,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
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
import { AdminLogin } from '@/features/auth/AdminLogin';
import {
  ApiError,
  logoutAdmin,
  refreshAdminSession,
  restoreAdminSession,
  type AdminSession,
} from '@/features/auth/admin-auth';
import {
  getAdminDashboard,
  type AdminDashboardData,
} from '@/features/dashboard/admin-dashboard';
import {
  AdminListingsPage,
  AdminUsersPage,
} from '@/features/management/ManagementPage';
import { AuditLogPage } from '@/features/management/AuditLogPage';
import {
  MonitoringPage,
  TaskRunsPage,
} from '@/features/operations/OperationsPages';
import { MediaLibraryPage } from '@/features/media/MediaLibraryPage';
import { MediaProjectsPage } from '@/features/media/MediaProjectsPage';

type ConsoleView =
  | 'overview'
  | 'users'
  | 'listings'
  | 'monitoring'
  | 'tasks'
  | 'projects'
  | 'media'
  | 'audit';

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, view: 'overview', enabled: true },
  { label: 'Users', icon: Users, view: 'users', enabled: true },
  { label: 'Listings', icon: House, view: 'listings', enabled: true },
  {
    label: 'API monitoring',
    icon: Activity,
    view: 'monitoring',
    enabled: true,
  },
  { label: 'Agents', icon: Building2, view: 'agents', enabled: false },
  { label: 'Locations', icon: MapPin, view: 'locations', enabled: false },
  { label: 'Tasks', icon: ListTodo, view: 'tasks', enabled: true },
  { label: 'Projects', icon: FolderKanban, view: 'projects', enabled: true },
  { label: 'Media', icon: Image, view: 'media', enabled: true },
  { label: 'Audit log', icon: ShieldCheck, view: 'audit', enabled: true },
];

export default function Home() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    restoreAdminSession()
      .then((restored) => {
        if (active) setSession(restored);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (checkingSession) {
    return <SessionLoading />;
  }

  if (!session) {
    return <AdminLogin onAuthenticated={setSession} />;
  }

  async function signOut() {
    if (!session) return;
    try {
      await logoutAdmin(session.csrfToken);
    } finally {
      setSession(null);
    }
  }

  return (
    <Dashboard
      session={session}
      onSessionUpdated={setSession}
      onSessionExpired={() => setSession(null)}
      onLogout={signOut}
    />
  );
}

function Dashboard({
  session,
  onSessionUpdated,
  onSessionExpired,
  onLogout,
}: {
  session: AdminSession;
  onSessionUpdated: (session: AdminSession) => void;
  onSessionExpired: () => void;
  onLogout: () => Promise<void>;
}) {
  const { user } = session;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [activeView, setActiveView] = useState<ConsoleView>(() =>
    readConsoleView(window.location.hash),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    window.localStorage.getItem('findam-console-sidebar') === 'collapsed',
  );

  useEffect(() => {
    window.localStorage.setItem(
      'findam-console-sidebar',
      sidebarCollapsed ? 'collapsed' : 'expanded',
    );
  }, [sidebarCollapsed]);

  useEffect(() => {
    const updateView = () =>
      setActiveView(readConsoleView(window.location.hash));
    window.addEventListener('hashchange', updateView);
    return () => window.removeEventListener('hashchange', updateView);
  }, []);

  const recoverSession = useCallback(async () => {
    try {
      onSessionUpdated(await refreshAdminSession(session.csrfToken));
      return true;
    } catch {
      onSessionExpired();
      return false;
    }
  }, [onSessionExpired, onSessionUpdated, session.csrfToken]);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    setDashboardError(null);
    try {
      setDashboard(await getAdminDashboard());
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        try {
          const refreshedSession = await refreshAdminSession(session.csrfToken);
          onSessionUpdated(refreshedSession);
          setDashboard(await getAdminDashboard());
          return;
        } catch {
          onSessionExpired();
          return;
        }
      }
      setDashboardError(
        caught instanceof ApiError
          ? caught.message
          : 'Live dashboard data could not be loaded.',
      );
    } finally {
      setRefreshing(false);
    }
  }, [onSessionExpired, onSessionUpdated, session.csrfToken]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    const interval = window.setInterval(() => void loadDashboard(), 30_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  const marketplace = dashboard?.marketplace;
  const stats = [
    {
      label: 'API status',
      value: dashboard ? titleCase(dashboard.api.status) : '—',
      detail: dashboard
        ? `Up for ${formatDuration(dashboard.api.uptimeSeconds)}`
        : 'Connecting to the API',
      icon: Server,
      tone: dashboard?.api.status === 'degraded' ? 'warning' : 'success',
    },
    {
      label: 'Active listings',
      value: formatMetric(marketplace?.listingsActive),
      detail: marketplace
        ? `${marketplace.newListingsSevenDays} added in 7 days`
        : 'Waiting for database',
      icon: House,
      tone: 'primary',
    },
    {
      label: 'Registered users',
      value: formatMetric(marketplace?.usersTotal),
      detail: marketplace
        ? `${marketplace.newUsersSevenDays} joined in 7 days`
        : 'Waiting for database',
      icon: Users,
      tone: 'primary',
    },
    {
      label: 'Agent profiles',
      value: formatMetric(marketplace?.agentsTotal),
      detail: marketplace
        ? `${marketplace.usersActive} active accounts`
        : 'Waiting for database',
      icon: Building2,
      tone: 'primary',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        <div
          className={`flex h-18 items-center border-b border-sidebar-border ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}
        >
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground shadow-[0_0_24px_rgb(47_129_247/22%)]">
            F
          </div>
          <div className={sidebarCollapsed ? 'hidden' : undefined}>
            <p className="font-semibold tracking-tight">Findam</p>
            <p className="text-xs text-muted-foreground">API Console</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-4 top-1/2 z-40 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-lg transition hover:bg-sidebar-accent hover:text-foreground"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>

        <nav className={`flex-1 space-y-1 p-3 ${sidebarCollapsed ? 'px-2' : ''}`} aria-label="Console navigation">
          <p className={`px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground ${sidebarCollapsed ? 'sr-only' : ''}`}>
            Workspace
          </p>
          {navigation.map(({ label, icon: Icon, view, enabled }) => {
            const active = activeView === view;
            const classes = `group flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${sidebarCollapsed ? 'justify-center px-0' : ''} ${
              active
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : enabled
                  ? 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
                  : 'cursor-not-allowed text-muted-foreground/50'
            }`;
            const content = (
              <>
                <Icon className={`size-4 ${active ? 'text-primary' : ''}`} />
                <span className={sidebarCollapsed ? 'sr-only' : 'flex-1'}>{label}</span>
                {!enabled && !sidebarCollapsed ? (
                  <span className="text-[9px] uppercase tracking-wider">
                    Soon
                  </span>
                ) : null}
              </>
            );
            return enabled ? (
              <a
                key={label}
                href={`#${view}`}
                aria-current={active ? 'page' : undefined}
                data-tooltip={sidebarCollapsed ? label : undefined}
                className={`${classes} ${sidebarCollapsed ? 'rail-tooltip relative' : ''}`}
              >
                {content}
              </a>
            ) : (
              <div
                key={label}
                className={`${classes} ${sidebarCollapsed ? 'rail-tooltip relative' : ''}`}
                aria-disabled="true"
                data-tooltip={sidebarCollapsed ? `${label} (coming soon)` : undefined}
              >
                {content}
              </div>
            );
          })}
        </nav>

        <div className={`border-t border-sidebar-border p-3 ${sidebarCollapsed ? 'px-2' : ''}`}>
          <div
            className={`flex h-10 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground/50 ${sidebarCollapsed ? 'rail-tooltip relative justify-center px-0' : ''}`}
            aria-disabled="true"
            data-tooltip={sidebarCollapsed ? 'Settings (coming soon)' : undefined}
          >
            <Settings className="size-4" />
            <span className={sidebarCollapsed ? 'sr-only' : 'flex-1'}>Settings</span>
            {!sidebarCollapsed ? <span className="text-[9px] uppercase tracking-wider">Soon</span> : null}
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className={`mt-2 flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-background/40 p-3 text-left transition hover:border-primary/30 hover:bg-sidebar-accent ${sidebarCollapsed ? 'rail-tooltip relative justify-center px-0' : ''}`}
            data-tooltip={sidebarCollapsed ? 'Sign out' : undefined}
          >
            <div className={`${sidebarCollapsed ? 'hidden' : 'grid'} size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary`}>
              {initials.toUpperCase()}
            </div>
            <div className={sidebarCollapsed ? 'sr-only' : 'min-w-0 flex-1'}>
              <p className="truncate text-xs font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Super administrator
              </p>
            </div>
            <LogOut className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-border bg-background/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-black text-primary-foreground">
              F
            </div>
            <span className="text-sm font-semibold">API Console</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{titleCase(activeView)}</p>
            <p className="text-[11px] text-muted-foreground">
              Findam operations workspace
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden border-success/25 bg-success/8 text-success sm:inline-flex"
            >
              <span className="size-1.5 rounded-full bg-success" />
              Local development
            </Badge>
            <nav
              className="flex gap-1 lg:hidden"
              aria-label="Mobile console navigation"
            >
              {navigation
                .filter((item) => item.enabled)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.view}
                      aria-label={item.label}
                      variant={activeView === item.view ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        window.location.hash = item.view;
                      }}
                    >
                      <Icon />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Button>
                  );
                })}
            </nav>
          </div>
        </header>

        {activeView === 'overview' ? (
          <main
            id="overview"
            className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {dashboard
                    ? `Updated ${formatRelativeTime(dashboard.generatedAt)}`
                    : 'Connecting to live data'}
                </div>
                <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                  System overview
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Monitor the Findam API and marketplace from one place.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-success/25 bg-success/8 text-success"
                >
                  <span className="size-1.5 rounded-full bg-success" />
                  Live data
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  onClick={() => void loadDashboard()}
                >
                  <RefreshCw className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </Button>
              </div>
            </section>

            {dashboardError ? (
              <div
                role="alert"
                className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <p className="flex-1">{dashboardError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadDashboard()}
                >
                  Try again
                </Button>
              </div>
            ) : null}

            <section
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="System statistics"
            >
              {stats.map(({ label, value, detail, icon: Icon, tone }) => (
                <Card
                  key={label}
                  className="border-border/80 bg-card/72 shadow-none ring-0"
                >
                  <CardHeader>
                    <CardDescription>{label}</CardDescription>
                    <CardAction>
                      <div className={`stat-icon stat-icon-${tone}`}>
                        <Icon className="size-4" />
                      </div>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tracking-tight">
                      {value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {detail}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
              <Card className="border-border/80 bg-card/72 shadow-none ring-0">
                <CardHeader className="border-b border-border/70 pb-4">
                  <CardTitle>Service health</CardTitle>
                  <CardDescription>
                    Current status of core API dependencies
                  </CardDescription>
                  <CardAction>
                    <Badge
                      variant="outline"
                      className={
                        dashboard?.database.status === 'down'
                          ? 'border-destructive/25 bg-destructive/8 text-destructive'
                          : 'border-success/25 bg-success/8 text-success'
                      }
                    >
                      {dashboard?.database.status === 'down'
                        ? 'Degraded'
                        : 'Operational'}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="divide-y divide-border/70 px-0">
                  <ServiceRow
                    icon={Server}
                    name="NestJS API"
                    detail={
                      dashboard
                        ? `Version ${dashboard.api.version} · ${titleCase(dashboard.api.environment)}`
                        : 'Connecting to the API'
                    }
                    metric={
                      dashboard
                        ? formatDuration(dashboard.api.uptimeSeconds)
                        : '—'
                    }
                    status={dashboard?.api.status ?? 'healthy'}
                  />
                  <ServiceRow
                    icon={Database}
                    name="PostgreSQL + PostGIS"
                    detail="Primary application database"
                    metric={
                      dashboard?.database.latencyMs == null
                        ? '—'
                        : `${dashboard.database.latencyMs} ms`
                    }
                    status={dashboard?.database.status ?? 'healthy'}
                  />
                  <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                    <div className="grid size-9 place-items-center rounded-lg bg-warning/10 text-warning">
                      <AlertTriangle className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Media service</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Not configured yet
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-warning/25 bg-warning/8 text-warning"
                    >
                      Planned
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/72 shadow-none ring-0">
                <CardHeader className="border-b border-border/70 pb-4">
                  <CardTitle>Recent activity</CardTitle>
                  <CardDescription>Live marketplace events</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {dashboard?.recentActivity.length ? (
                    dashboard.recentActivity.map((activity) => {
                      const Icon =
                        activity.kind === 'LISTING_CREATED' ? House : Users;
                      return (
                        <div
                          key={activity.id}
                          className="flex gap-3 border-b border-border/60 px-4 py-3.5 last:border-0 sm:px-5"
                        >
                          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {activity.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {activity.detail}
                            </p>
                          </div>
                          <time
                            dateTime={activity.occurredAt}
                            className="whitespace-nowrap text-[11px] text-muted-foreground"
                          >
                            {formatRelativeTime(activity.occurredAt)}
                          </time>
                        </div>
                      );
                    })
                  ) : (
                    <div className="grid min-h-48 place-items-center px-5 text-center">
                      <div>
                        {refreshing ? (
                          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
                        ) : (
                          <Activity className="mx-auto size-5 text-muted-foreground" />
                        )}
                        <p className="mt-3 text-sm font-medium">
                          {refreshing ? 'Loading activity' : 'No activity yet'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          New registrations and listings will appear here.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-3">
              <QuickStatus
                label="All listings"
                value={formatMetric(marketplace?.listingsTotal)}
                detail="Excludes deleted records"
              />
              <QuickStatus
                label="Active accounts"
                value={formatMetric(marketplace?.usersActive)}
                detail="Currently enabled users"
              />
              <QuickStatus
                label="New this week"
                value={
                  marketplace
                    ? `${marketplace.newUsersSevenDays} / ${marketplace.newListingsSevenDays}`
                    : '—'
                }
                detail="Users / listings"
              />
            </section>
          </main>
        ) : activeView === 'users' ? (
          <AdminUsersPage
            recoverSession={recoverSession}
            csrfToken={session.csrfToken}
          />
        ) : activeView === 'listings' ? (
          <AdminListingsPage
            recoverSession={recoverSession}
            csrfToken={session.csrfToken}
          />
        ) : activeView === 'monitoring' ? (
          <MonitoringPage recoverSession={recoverSession} />
        ) : activeView === 'tasks' ? (
          <TaskRunsPage
            recoverSession={recoverSession}
            csrfToken={session.csrfToken}
          />
        ) : activeView === 'projects' ? (
          <MediaProjectsPage
            recoverSession={recoverSession}
            csrfToken={session.csrfToken}
          />
        ) : activeView === 'media' ? (
          <MediaLibraryPage
            recoverSession={recoverSession}
            csrfToken={session.csrfToken}
          />
        ) : (
          <AuditLogPage recoverSession={recoverSession} />
        )}
      </div>
    </div>
  );
}

function SessionLoading() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Loader2 className="size-5 animate-spin" />
        </div>
        <p className="mt-4 text-sm font-medium">
          Checking administrator session
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Connecting to the Findam API…
        </p>
      </div>
    </main>
  );
}

function ServiceRow({
  icon: Icon,
  name,
  detail,
  metric,
  status,
}: {
  icon: typeof Server;
  name: string;
  detail: string;
  metric: string;
  status: 'healthy' | 'degraded' | 'down';
}) {
  const healthy = status === 'healthy';
  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <div
        className={`grid size-9 place-items-center rounded-lg ${
          healthy
            ? 'bg-success/10 text-success'
            : 'bg-destructive/10 text-destructive'
        }`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{name}</p>
          {healthy ? (
            <CheckCircle2 className="size-3.5 text-success" />
          ) : (
            <AlertTriangle className="size-3.5 text-destructive" />
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs text-foreground">{metric}</p>
        <p
          className={`text-[10px] ${
            healthy ? 'text-muted-foreground' : 'text-destructive'
          }`}
        >
          {healthy ? 'Healthy' : titleCase(status)}
        </p>
      </div>
    </div>
  );
}

function QuickStatus({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card size="sm" className="border-border/80 bg-card/50 shadow-none ring-0">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-semibold">{value}</p>
        </div>
        <p className="max-w-28 text-right text-[11px] leading-relaxed text-muted-foreground">
          {detail}
        </p>
      </CardContent>
    </Card>
  );
}

function formatMetric(value: number | undefined) {
  return value === undefined ? '—' : new Intl.NumberFormat().format(value);
}

function formatDuration(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function formatRelativeTime(value: string) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1_000),
  );
  if (elapsedSeconds < 60) return 'just now';
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readConsoleView(hash: string): ConsoleView {
  const view = hash.replace('#', '');
  return view === 'users' ||
    view === 'listings' ||
    view === 'monitoring' ||
    view === 'tasks' ||
    view === 'projects' ||
    view === 'media' ||
    view === 'audit'
    ? view
    : 'overview';
}
