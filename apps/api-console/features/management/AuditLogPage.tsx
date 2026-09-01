import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ScrollText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  getAdminAuditLog,
  type AdminAuditAction,
  type AdminAuditLog,
  type PaginatedResponse,
} from './admin-resources';

export function AuditLogPage({
  recoverSession,
}: {
  recoverSession: () => Promise<boolean>;
}) {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedResponse<AdminAuditLog> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters = { action, page };
    try {
      setResult(await getAdminAuditLog(filters));
    } catch (caught) {
      let requestError = caught;
      if (
        requestError instanceof ApiError &&
        requestError.status === 401 &&
        (await recoverSession())
      ) {
        try {
          setResult(await getAdminAuditLog(filters));
          return;
        } catch (retryError) {
          requestError = retryError;
        }
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The audit trail could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [action, page, recoverSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const total = result?.total ?? 0;
  const currentPage = result?.page ?? page;
  const first = total === 0 ? 0 : (currentPage - 1) * 20 + 1;
  const last = Math.min((result?.page ?? page) * 20, total);

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mb-6 flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <ScrollText className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
              Audit log
            </h1>
            {result ? (
              <Badge variant="outline">{total.toLocaleString()}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A permanent record of administrative changes in this console.
          </p>
        </div>
      </section>

      <Card className="border-border/80 bg-card/72 shadow-none ring-0">
        <CardContent className="p-0">
          <div className="border-b border-border/70 p-4">
            <NativeSelect
              aria-label="Filter audit log by action"
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
            >
              <NativeSelectOption value="">All actions</NativeSelectOption>
              {auditActions.map((auditAction) => (
                <NativeSelectOption key={auditAction} value={auditAction}>
                  {titleCase(auditAction)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          {error ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <AlertTriangle className="size-6 text-destructive" />
              <p className="mt-3 text-sm font-medium">
                Could not load audit log
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              <Button
                className="mt-4"
                variant="outline"
                size="sm"
                onClick={() => void load()}
              >
                Try again
              </Button>
            </div>
          ) : loading && !result ? (
            <div className="grid min-h-72 place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : !result?.items.length ? (
            <div className="grid min-h-72 place-items-center px-6 text-center">
              <div>
                <ScrollText className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No activity yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirmed account and listing changes will appear here.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Changed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <AuditBadge action={entry.action} />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {entry.actor.firstName} {entry.actor.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actor.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {titleCase(entry.targetType)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {entry.targetId.slice(0, 8)}…
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {result?.items.length ? (
            <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {first}–{last} of {total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || !result.hasNextPage}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next <ChevronRight />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

const auditActions: AdminAuditAction[] = [
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'LISTING_APPROVED',
  'LISTING_REJECTED',
  'LISTING_ARCHIVED',
];

function AuditBadge({ action }: { action: AdminAuditAction }) {
  const destructive =
    action.includes('DEACTIVATED') ||
    action.includes('REJECTED') ||
    action.includes('ARCHIVED');
  return (
    <Badge
      variant="outline"
      className={
        destructive
          ? 'border-destructive/25 bg-destructive/8 text-destructive'
          : 'border-success/25 bg-success/8 text-success'
      }
    >
      {titleCase(action)}
    </Badge>
  );
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
