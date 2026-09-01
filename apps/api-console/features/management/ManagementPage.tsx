import { type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  House,
  Loader2,
  Search,
  ShieldAlert,
  UserRoundCheck,
  Users,
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
}: {
  recoverSession: RecoverSession;
  csrfToken: string;
}) {
  const [filters, setFilters] = useState<UsersFilters>({
    q: '',
    role: '',
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

  return (
    <ManagementLayout
      title="Users"
      description="Search and review every account using Findam."
      icon={Users}
      total={result?.total}
      search={search}
      searchPlaceholder="Search name, email, or phone"
      onSearchChange={setSearch}
      onSearch={submitSearch}
      filters={
        <>
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
            <TableRow key={user.id}>
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
                    onClick={() => {
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
