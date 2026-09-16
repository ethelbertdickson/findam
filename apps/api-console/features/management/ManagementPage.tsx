import { type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CalendarDays,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  House,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
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
  getManagedListings,
  getManagedUsers,
  moderateManagedListing,
  type ListingsFilters,
  type ListingModerationAction,
  type ManagedListing,
  type ManagedUser,
  type PaginatedResponse,
  type UsersFilters,
  updateManagedUserStatus,
  getManagedUserDetails,
  type ManagedUserDetails,
} from './admin-resources';

type RecoverSession = () => Promise<boolean>;
type PendingManagementAction =
  | { kind: 'user'; user: ManagedUser; isActive: boolean }
  | {
      kind: 'listing';
      listing: ManagedListing;
      action: ListingModerationAction;
    };

export function AdminUsersPage({
  recoverSession,
  csrfToken,
  fixedRole,
}: {
  recoverSession: RecoverSession;
  csrfToken: string;
  fixedRole?: UsersFilters['role'];
}) {
  const [filters, setFilters] = useState<UsersFilters>({
    q: '',
    role: fixedRole ?? '',
    status: '',
    page: 1,
  });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<PaginatedResponse<ManagedUser> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingManagementAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUserDetails | null>(
    null,
  );
  const [selectedUserIndex, setSelectedUserIndex] = useState(-1);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsUpdatedAt, setDetailsUpdatedAt] = useState<Date | null>(null);
  const [monitorNow, setMonitorNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await getManagedUsers(filters));
    } catch (caught) {
      let requestError = caught;
      if (
        requestError instanceof ApiError &&
        requestError.status === 401 &&
        (await recoverSession())
      ) {
        try {
          setResult(await getManagedUsers(filters));
          return;
        } catch (retryError) {
          requestError = retryError;
        }
      }
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters, recoverSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = search.trim();
      setFilters((current) =>
        current.q === nextQuery
          ? current
          : { ...current, q: nextQuery, page: 1 },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  function submitSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({ ...current, q: search.trim(), page: 1 }));
  }

  async function confirmAction() {
    if (!pendingAction || pendingAction.kind !== 'user') return;
    setActing(true);
    setActionError(null);
    try {
      await updateManagedUserStatus(
        pendingAction.user.id,
        pendingAction.isActive,
        csrfToken,
      );
      setPendingAction(null);
      await load();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setActing(false);
    }
  }

  async function openDetails(user: ManagedUser) {
    setDetailsLoading(true);
    try {
      setSelectedUserIndex(
        result?.items.findIndex((item) => item.id === user.id) ?? -1,
      );
      const details = await getManagedUserDetails(user.id);
      setSelectedUser(details);
      setDetailsUpdatedAt(new Date());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setDetailsLoading(false);
    }
  }

  async function moveDetails(step: -1 | 1) {
    if (!result?.items.length || selectedUserIndex < 0) return;
    const nextIndex = selectedUserIndex + step;
    if (nextIndex < 0 || nextIndex >= result.items.length) return;
    await openDetails(result.items[nextIndex]);
  }

  const hasLiveSession = Boolean(
    selectedUser?.projectorProSessions.some((session) => session.status === 'ACTIVE'),
  );
  const totalConsumedSeconds = selectedUser?.projectorProSessions.reduce(
    (sum, session) => sum + (session.status === 'ACTIVE'
      ? Math.max(session.consumedSeconds, Math.floor((monitorNow - new Date(session.createdAt).getTime()) / 1000))
      : session.consumedSeconds),
    0,
  ) ?? 0;

  useEffect(() => {
    if (!selectedUser || !hasLiveSession) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const fresh = await getManagedUserDetails(selectedUser.id);
        if (!cancelled) {
          setSelectedUser((current) => current?.id === fresh.id ? fresh : current);
          setDetailsUpdatedAt(new Date());
        }
      } catch {
        // Keep the last known data visible; the next poll can recover.
      }
    };
    const pollTimer = window.setInterval(() => void poll(), 3000);
    const clockTimer = window.setInterval(() => setMonitorNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.clearInterval(clockTimer);
    };
  }, [selectedUser?.id, hasLiveSession]);

  return (
    <ManagementLayout
      title={fixedRole === 'AGENT' ? 'Agents' : 'Users'}
      description={
        fixedRole === 'AGENT'
          ? 'Review and manage every marketplace agent.'
          : 'Search and review every account using Findam.'
      }
      icon={Users}
      total={result?.total}
      search={search}
      searchPlaceholder="Search name, email, or phone"
      onSearchChange={setSearch}
      onSearch={submitSearch}
      filters={
        <>
          {!fixedRole ? (
            <NativeSelect
              aria-label="Filter users by role"
              value={filters.role}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  role: event.target.value,
                  page: 1,
                }))
              }
            >
              <NativeSelectOption value="">All roles</NativeSelectOption>
              <NativeSelectOption value="USER">Users</NativeSelectOption>
              <NativeSelectOption value="AGENT">Agents</NativeSelectOption>
              <NativeSelectOption value="ADMIN">
                Administrators
              </NativeSelectOption>
            </NativeSelect>
          ) : null}
          <NativeSelect
            aria-label="Filter users by status"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
                page: 1,
              }))
            }
          >
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            <NativeSelectOption value="ACTIVE">Active</NativeSelectOption>
            <NativeSelectOption value="INACTIVE">Inactive</NativeSelectOption>
          </NativeSelect>
        </>
      }
      loading={loading}
      error={error}
      empty={!result?.items.length}
      onRetry={() => void load()}
      emptyMessage="No users match these filters."
      pagination={
        <Pagination
          page={result?.page ?? filters.page}
          total={result?.total ?? 0}
          limit={result?.limit ?? 20}
          hasNextPage={result?.hasNextPage ?? false}
          loading={loading}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
        />
      }
    >
      {detailsLoading ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Loading account details…
        </p>
      ) : null}
      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
            setDetailsUpdatedAt(null);
          }
        }}
      >
        <DialogContent
          className="user-detail-popup !grid !grid-rows-[auto_minmax(0,1fr)] !gap-0 !overflow-hidden !p-0"
          style={{ translate: 'none' }}
        >
          {selectedUser ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card px-5 py-4 pr-14 sm:px-8 sm:py-5 sm:pr-16">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar name={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-xl font-semibold sm:text-2xl">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </DialogTitle>
                    <DialogDescription className="mt-1 truncate">
                      {selectedUser.email} {selectedUser.phone ? `· ${selectedUser.phone}` : ''} · {titleCase(selectedUser.role)} · {selectedUser.isActive ? 'Active' : 'Suspended'}
                    </DialogDescription>
                  </div>
                </div>
                <nav className="flex items-center gap-2" aria-label="User detail navigation">
                  <Button variant="outline" size="sm" disabled={selectedUserIndex <= 0 || detailsLoading} onClick={() => void moveDetails(-1)}>
                    <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
                    {selectedUserIndex + 1} of {result?.items.length ?? 0}
                  </span>
                  <Button variant="outline" size="sm" disabled={selectedUserIndex < 0 || selectedUserIndex >= (result?.items.length ?? 1) - 1 || detailsLoading} onClick={() => void moveDetails(1)}>
                    <span className="hidden sm:inline">Next</span> <ChevronRight />
                  </Button>
                </nav>
              </header>
              <main className="min-h-0 overflow-y-auto bg-background px-4 py-5 sm:px-8 sm:py-7">
                <div className="mx-auto max-w-[1600px] space-y-6">
                  {selectedUser.projectorProWallet || selectedUser.projectorProTrialAvailable || selectedUser.projectorProPurchases.length || selectedUser.projectorProSessions.length || selectedUser.projectorProTrialDevices.length ? (
                    <>
                      {hasLiveSession ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                          <div className="flex items-center gap-3">
                            <span className="relative flex size-3"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex size-3 rounded-full bg-emerald-400" /></span>
                            <div><p className="font-semibold">ProjectorPro session live</p><p className="text-xs text-emerald-100/70">Usage and balance are refreshing automatically</p></div>
                          </div>
                          <p className="flex items-center gap-2 text-xs text-emerald-100/80"><RefreshCw className="size-3.5 animate-spin" /> Updated {detailsUpdatedAt ? formatDateTime(detailsUpdatedAt.toISOString()) : 'just now'}</p>
                        </div>
                      ) : null}
                      <section aria-label="ProjectorPro account summary">
                        <div className="mb-3 flex items-center gap-2"><CreditCard className="size-4 text-primary" /><h2 className="font-semibold">ProjectorPro usage</h2></div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <Metric label="Available balance" value={formatSeconds(selectedUser.projectorProWallet?.balanceSeconds ?? (selectedUser.projectorProTrialAvailable ? 3600 : 0))} />
                          <Metric label="Purchased" value={formatSeconds(selectedUser.projectorProPurchases.filter((item) => item.status === 'SUCCESS').reduce((sum, item) => sum + item.creditSeconds, 0))} />
                          <Metric label="Consumed total" value={formatSeconds(totalConsumedSeconds)} />
                          <Metric label="Sessions" value={String(selectedUser.projectorProSessions.length)} />
                        </div>
                      </section>
                      <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
                        <DetailFact icon={CalendarDays} label="Account created" value={formatDateTime(selectedUser.createdAt)} />
                        <DetailFact icon={Clock3} label="Latest login" value={selectedUser.refreshTokens[0] ? formatDateTime(selectedUser.refreshTokens[0].createdAt) : 'No session recorded'} />
                        <DetailFact icon={CreditCard} label="Trial status" value={selectedUser.projectorProWallet?.trialGrantedAt ? `Granted ${formatDateTime(selectedUser.projectorProWallet.trialGrantedAt)}` : selectedUser.projectorProTrialAvailable ? 'Available — not claimed' : 'Not granted'} />
                        <DetailFact icon={Activity} label="Account activity" value={`${selectedUser.refreshTokens.length} recent login records · ${selectedUser.projectorProTrialDevices.length} trial devices`} />
                      </section>
                      <div className="grid items-start gap-5 2xl:grid-cols-2">
                        <section className="overflow-hidden rounded-xl border bg-card">
                          <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Transcription sessions</h2><p className="mt-1 text-xs text-muted-foreground">Live elapsed time is estimated between server updates.</p></div><Badge variant="outline">{selectedUser.projectorProSessions.length} records</Badge></div>
                          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Usage</th><th className="px-5 py-3 font-medium">Started</th><th className="px-5 py-3 font-medium">Ended</th><th className="px-5 py-3 font-medium">Device</th></tr></thead><tbody className="divide-y">{selectedUser.projectorProSessions.length ? selectedUser.projectorProSessions.map((item) => {
                            const isLive = item.status === 'ACTIVE';
                            const elapsed = isLive ? Math.max(item.consumedSeconds, Math.floor((monitorNow - new Date(item.createdAt).getTime()) / 1000)) : item.consumedSeconds;
                            return <tr key={item.id} className={isLive ? 'bg-emerald-500/5' : ''}><td className="px-5 py-3"><Badge variant={isLive ? 'default' : 'outline'} className={isLive ? 'bg-emerald-600' : ''}>{isLive ? <><Radio className="mr-1 size-3" />Live</> : titleCase(item.status)}</Badge></td><td className="px-5 py-3 tabular-nums">{formatSeconds(elapsed)} <span className="text-xs text-muted-foreground">/ {formatSeconds(item.reservedSeconds)} reserved</span></td><td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{formatDateTime(item.createdAt)}</td><td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{item.completedAt ? formatDateTime(item.completedAt) : isLive ? 'In progress' : '—'}</td><td className="max-w-52 truncate px-5 py-3 font-mono text-xs text-muted-foreground" title={item.installationId}>{item.installationId}</td></tr>;
                          }) : <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">No ProjectorPro sessions.</td></tr>}</tbody></table></div>
                        </section>
                        <section className="overflow-hidden rounded-xl border bg-card">
                          <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Credit ledger</h2><p className="mt-1 text-xs text-muted-foreground">Every reservation, release, purchase, and metered charge.</p></div><Badge variant="outline">{selectedUser.projectorProWallet?.entries?.length ?? 0} entries</Badge></div>
                          <div className="max-h-[34rem] overflow-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 bg-card text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Entry</th><th className="px-5 py-3 font-medium">Change</th><th className="px-5 py-3 font-medium">Description</th><th className="px-5 py-3 font-medium">Time</th></tr></thead><tbody className="divide-y">{selectedUser.projectorProWallet?.entries?.length ? selectedUser.projectorProWallet.entries.map((item) => <tr key={item.id}><td className="px-5 py-3">{titleCase(item.type)}</td><td className={`px-5 py-3 font-semibold tabular-nums ${item.seconds < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{item.seconds > 0 ? '+' : ''}{formatSeconds(item.seconds)}</td><td className="max-w-72 px-5 py-3 text-muted-foreground">{item.description}</td><td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</td></tr>) : <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">No credit entries.</td></tr>}</tbody></table></div>
                        </section>
                      </div>
                      <section className="overflow-hidden rounded-xl border bg-card">
                        <div className="border-b px-5 py-4"><h2 className="font-semibold">Purchases and device trials</h2><p className="mt-1 text-xs text-muted-foreground">Payment fulfillment history and trial-device records.</p></div>
                        <div className="grid divide-y xl:grid-cols-2 xl:divide-x xl:divide-y-0">
                          <div className="p-5"><h3 className="mb-3 text-sm font-medium">Credit purchases</h3>{selectedUser.projectorProPurchases.length ? <div className="space-y-3">{selectedUser.projectorProPurchases.map((purchase, index) => <div key={`${purchase.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-medium">{purchase.packageCode} · {formatSeconds(purchase.creditSeconds)}</p><p className="text-xs text-muted-foreground">Created {formatDateTime(purchase.createdAt)}{purchase.fulfilledAt ? ` · fulfilled ${formatDateTime(purchase.fulfilledAt)}` : ''}</p></div><Badge variant="outline">{titleCase(purchase.status)}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No purchases recorded.</p>}</div>
                          <div className="p-5"><h3 className="mb-3 text-sm font-medium">Trial devices</h3>{selectedUser.projectorProTrialDevices.length ? <div className="space-y-3">{selectedUser.projectorProTrialDevices.map((device) => <div key={device.deviceId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span className="break-all font-mono text-xs text-muted-foreground">{device.deviceId}</span><span className="text-xs text-muted-foreground">Granted {formatDateTime(device.grantedAt)}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No trial device records.</p>}</div>
                        </div>
                      </section>
                    </>
                  ) : (
                    <section className="rounded-xl border bg-card p-6 sm:p-8"><h2 className="text-lg font-semibold">Marketplace account</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">This account has no ProjectorPro wallet, billing activity, or transcription sessions. Its Findam account details are shown above.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><DetailFact icon={CalendarDays} label="Account created" value={formatDateTime(selectedUser.createdAt)} /><DetailFact icon={Clock3} label="Latest login" value={selectedUser.refreshTokens[0] ? formatDateTime(selectedUser.refreshTokens[0].createdAt) : 'No session recorded'} /></div></section>
                  )}
                </div>
              </main>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Listings</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result?.items.map((user) => (
            <TableRow
              key={user.id}
              className="cursor-pointer"
              onClick={() => void openDetails(user)}
            >
              <TableCell className="min-w-64 whitespace-normal py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={`${user.firstName} ${user.lastName}`} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{titleCase(user.role)}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge active={user.isActive} />
              </TableCell>
              <TableCell>{user._count.listings}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                {user.role === 'ADMIN' ? (
                  <span className="text-xs text-muted-foreground">
                    Protected
                  </span>
                ) : (
                  <Button
                    variant={user.isActive ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionError(null);
                      setPendingAction({
                        kind: 'user',
                        user,
                        isActive: !user.isActive,
                      });
                    }}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ManagementActionDialog
        pendingAction={pendingAction}
        actionError={actionError}
        acting={acting}
        onCancel={() => {
          if (!acting) setPendingAction(null);
        }}
        onConfirm={() => void confirmAction()}
      />
    </ManagementLayout>
  );
}

export function AdminAgentsPage({
  recoverSession,
  csrfToken,
}: {
  recoverSession: RecoverSession;
  csrfToken: string;
}) {
  return (
    <AdminUsersPage
      recoverSession={recoverSession}
      csrfToken={csrfToken}
      fixedRole="AGENT"
    />
  );
}

export function AdminListingsPage({
  recoverSession,
  csrfToken,
}: {
  recoverSession: RecoverSession;
  csrfToken: string;
}) {
  const [filters, setFilters] = useState<ListingsFilters>({
    q: '',
    type: '',
    status: '',
    page: 1,
  });
  const [search, setSearch] = useState('');
  const [result, setResult] =
    useState<PaginatedResponse<ManagedListing> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingManagementAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await getManagedListings(filters));
    } catch (caught) {
      let requestError = caught;
      if (
        requestError instanceof ApiError &&
        requestError.status === 401 &&
        (await recoverSession())
      ) {
        try {
          setResult(await getManagedListings(filters));
          return;
        } catch (retryError) {
          requestError = retryError;
        }
      }
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters, recoverSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = search.trim();
      setFilters((current) =>
        current.q === nextQuery
          ? current
          : { ...current, q: nextQuery, page: 1 },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  function submitSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({ ...current, q: search.trim(), page: 1 }));
  }

  async function confirmAction() {
    if (!pendingAction || pendingAction.kind !== 'listing') return;
    setActing(true);
    setActionError(null);
    try {
      await moderateManagedListing(
        pendingAction.listing.id,
        pendingAction.action,
        csrfToken,
      );
      setPendingAction(null);
      await load();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setActing(false);
    }
  }

  return (
    <ManagementLayout
      title="Listings"
      description="Review the inventory currently stored in the marketplace."
      icon={House}
      total={result?.total}
      search={search}
      searchPlaceholder="Search title, owner, or location"
      onSearchChange={setSearch}
      onSearch={submitSearch}
      filters={
        <>
          <NativeSelect
            aria-label="Filter listings by type"
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                type: event.target.value,
                page: 1,
              }))
            }
          >
            <NativeSelectOption value="">All types</NativeSelectOption>
            <NativeSelectOption value="PROPERTY">Property</NativeSelectOption>
            <NativeSelectOption value="LAND">Land</NativeSelectOption>
            <NativeSelectOption value="HOUSEHOLD">Household</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label="Filter listings by status"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
                page: 1,
              }))
            }
          >
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            {[
              'DRAFT',
              'PENDING',
              'ACTIVE',
              'RENTED',
              'SOLD',
              'EXPIRED',
              'REJECTED',
              'ARCHIVED',
            ].map((status) => (
              <NativeSelectOption key={status} value={status}>
                {titleCase(status)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </>
      }
      loading={loading}
      error={error}
      empty={!result?.items.length}
      onRetry={() => void load()}
      emptyMessage="No listings match these filters."
      pagination={
        <Pagination
          page={result?.page ?? filters.page}
          total={result?.total ?? 0}
          limit={result?.limit ?? 20}
          hasNextPage={result?.hasNextPage ?? false}
          loading={loading}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Listing</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result?.items.map((listing) => (
            <TableRow key={listing.id}>
              <TableCell className="min-w-72 whitespace-normal py-3">
                <div className="flex items-center gap-3">
                  <ListingImage listing={listing} />
                  <div className="min-w-0">
                    <p className="max-w-72 truncate font-medium">
                      {listing.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {listing.city.name}, {listing.state.name}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{titleCase(listing.type)}</TableCell>
              <TableCell className="font-medium">
                {formatCurrency(listing.price)}
              </TableCell>
              <TableCell>
                <ListingStatusBadge status={listing.status} />
              </TableCell>
              <TableCell>
                <p className="font-medium">
                  {listing.owner.firstName} {listing.owner.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {listing.owner.email}
                </p>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(listing.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1.5">
                  <ListingActionButton
                    label="Approve"
                    action="APPROVE"
                    listing={listing}
                    onSelect={setPendingAction}
                    disabled={listing.status === 'ACTIVE'}
                  />
                  <ListingActionButton
                    label="Reject"
                    action="REJECT"
                    listing={listing}
                    onSelect={setPendingAction}
                    disabled={listing.status === 'REJECTED'}
                  />
                  <ListingActionButton
                    label="Archive"
                    action="ARCHIVE"
                    listing={listing}
                    onSelect={setPendingAction}
                    disabled={listing.status === 'ARCHIVED'}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ManagementActionDialog
        pendingAction={pendingAction}
        actionError={actionError}
        acting={acting}
        onCancel={() => {
          if (!acting) setPendingAction(null);
        }}
        onConfirm={() => void confirmAction()}
      />
    </ManagementLayout>
  );
}

function ListingActionButton({
  label,
  action,
  listing,
  onSelect,
  disabled,
}: {
  label: string;
  action: ListingModerationAction;
  listing: ManagedListing;
  onSelect: (action: PendingManagementAction) => void;
  disabled: boolean;
}) {
  return (
    <Button
      variant={action === 'REJECT' ? 'outline' : 'secondary'}
      size="sm"
      disabled={disabled}
      onClick={() => {
        onSelect({ kind: 'listing', listing, action });
      }}
    >
      {label}
    </Button>
  );
}

function ManagementActionDialog({
  pendingAction,
  actionError,
  acting,
  onCancel,
  onConfirm,
}: {
  pendingAction: PendingManagementAction | null;
  actionError: string | null;
  acting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = pendingAction ? actionDialogCopy(pendingAction) : null;
  return (
    <AlertDialog
      open={pendingAction !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={
              copy?.destructive
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }
          >
            {copy?.destructive ? <ShieldAlert /> : <UserRoundCheck />}
          </AlertDialogMedia>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {actionError ? (
          <p className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {actionError}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={acting}
            variant={copy?.destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {acting ? <Loader2 className="animate-spin" /> : null}
            {copy?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function actionDialogCopy(action: PendingManagementAction) {
  if (action.kind === 'user') {
    const name = `${action.user.firstName} ${action.user.lastName}`;
    return action.isActive
      ? {
          title: `Activate ${name}?`,
          description:
            'This restores the account’s ability to sign in and use Findam.',
          confirmLabel: 'Activate account',
          destructive: false,
        }
      : {
          title: `Deactivate ${name}?`,
          description:
            'This immediately prevents the account from signing in. You can restore it later.',
          confirmLabel: 'Deactivate account',
          destructive: true,
        };
  }

  const title = action.listing.title;
  switch (action.action) {
    case 'APPROVE':
      return {
        title: `Approve “${title}”?`,
        description: 'The listing will become active and visible in Findam.',
        confirmLabel: 'Approve listing',
        destructive: false,
      };
    case 'REJECT':
      return {
        title: `Reject “${title}”?`,
        description:
          'The listing will be hidden from Findam until reviewed again.',
        confirmLabel: 'Reject listing',
        destructive: true,
      };
    case 'ARCHIVE':
      return {
        title: `Archive “${title}”?`,
        description: 'The listing will be removed from the active marketplace.',
        confirmLabel: 'Archive listing',
        destructive: true,
      };
  }
}

function ManagementLayout({
  title,
  description,
  icon: Icon,
  total,
  search,
  searchPlaceholder,
  onSearchChange,
  onSearch,
  filters,
  loading,
  error,
  empty,
  onRetry,
  emptyMessage,
  pagination,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Users;
  total: number | undefined;
  search: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onSearch: (event: SyntheticEvent<HTMLFormElement>) => void;
  filters: React.ReactNode;
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
  emptyMessage: string;
  pagination: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mb-6 flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
              {title}
            </h1>
            {total !== undefined ? (
              <Badge variant="outline">{total.toLocaleString()}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </section>

      <Card className="border-border/80 bg-card/72 shadow-none ring-0">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center">
            <form onSubmit={onSearch} className="flex min-w-0 flex-1 gap-2">
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="pl-9"
                />
              </div>
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">{filters}</div>
          </div>

          {error ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <AlertTriangle className="size-6 text-destructive" />
              <p className="mt-3 text-sm font-medium">
                Could not load {title.toLowerCase()}
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {error}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                Try again
              </Button>
            </div>
          ) : loading && !total ? (
            <div className="grid min-h-72 place-items-center">
              <div className="text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Loading {title.toLowerCase()}…
                </p>
              </div>
            </div>
          ) : empty ? (
            <div className="grid min-h-72 place-items-center px-6 text-center">
              <div>
                <Icon className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Nothing to show</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {emptyMessage}
                </p>
              </div>
            </div>
          ) : (
            children
          )}

          {!error && !empty ? (
            <div className="border-t border-border/70 px-4 py-3">
              {pagination}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

function Pagination({
  page,
  total,
  limit,
  hasNextPage,
  loading,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  hasNextPage: boolean;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Showing {first}–{last} of {total.toLocaleString()}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || !hasNextPage}
          onClick={() => onPage(page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
      {initials.toUpperCase()}
    </div>
  );
}

function ListingImage({ listing }: { listing: ManagedListing }) {
  if (listing.imageUrl) {
    return (
      // oxlint-disable-next-line next/no-img-element -- remote listing images are dynamic API records.
      <img
        src={listing.imageUrl}
        alt=""
        className="size-11 shrink-0 rounded-lg border border-border object-cover"
      />
    );
  }
  return (
    <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
      <House className="size-4" />
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? 'border-success/25 bg-success/8 text-success'
          : 'border-destructive/25 bg-destructive/8 text-destructive'
      }
    >
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function ListingStatusBadge({ status }: { status: ManagedListing['status'] }) {
  const positive = ['ACTIVE', 'RENTED', 'SOLD'].includes(status);
  const negative = ['REJECTED', 'EXPIRED'].includes(status);
  return (
    <Badge
      variant="outline"
      className={
        positive
          ? 'border-success/25 bg-success/8 text-success'
          : negative
            ? 'border-destructive/25 bg-destructive/8 text-destructive'
            : 'border-warning/25 bg-warning/8 text-warning'
      }
    >
      {titleCase(status)}
    </Badge>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return minutes ? `${minutes}m ${remaining}s (${safe}s)` : `${safe}s`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-24 rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{value}</p>
    </div>
  );
}

function DetailFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The data could not be loaded. Please try again.';
}
