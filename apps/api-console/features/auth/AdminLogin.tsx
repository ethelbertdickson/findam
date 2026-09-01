import { useState, type SyntheticEvent } from 'react';
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, loginAdmin, type AdminSession } from './admin-auth';

export function AdminLogin({
  onAuthenticated,
}: {
  onAuthenticated: (session: AdminSession) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      onAuthenticated(await loginAdmin(email.trim(), password));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The API could not be reached. Confirm that it is running.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(480px,0.95fr)]">
      <section className="relative hidden overflow-hidden border-r border-border bg-sidebar px-12 py-10 lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgb(47_129_247/18%),transparent_28rem)]" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-base font-black text-primary-foreground shadow-[0_0_28px_rgb(47_129_247/28%)]">
            F
          </div>
          <div>
            <p className="font-semibold tracking-tight">Findam</p>
            <p className="text-xs text-muted-foreground">API Console</p>
          </div>
        </div>

        <div className="relative my-auto max-w-xl pb-10">
          <div className="mb-7 grid size-12 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-[-0.035em] xl:text-5xl">
            Operate Findam with clarity and control.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Monitor API health, review marketplace activity, and run controlled
            administrative tasks from one protected workspace.
          </p>

          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            <LoginFeature icon={Server} label="API health" />
            <LoginFeature icon={Activity} label="Live activity" />
            <LoginFeature icon={LockKeyhole} label="Audited access" />
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Findam internal operations · Local development
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
              F
            </div>
            <div>
              <p className="text-sm font-semibold">Findam</p>
              <p className="text-[11px] text-muted-foreground">API Console</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Administrator access
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em]">
              Sign in to the console
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use an active Findam administrator account. Normal user and agent
              accounts cannot access this workspace.
            </p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-email">
                Email address
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                placeholder="admin@findam.app"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
                required
                className="h-11 w-full rounded-lg border border-input bg-card/70 px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-3 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  required
                  className="h-11 w-full rounded-lg border border-input bg-card/70 px-3 pr-11 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-3 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="flex gap-3 rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-3 text-sm text-destructive"
              >
                <KeyRound className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="h-11 w-full justify-between px-4"
            >
              <span className="flex items-center gap-2">
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LockKeyhole className="size-4" />
                )}
                {submitting ? 'Signing in…' : 'Sign in securely'}
              </span>
              {!submitting ? <ArrowRight className="size-4" /> : null}
            </Button>
          </form>

          <p className="mt-7 text-center text-xs leading-5 text-muted-foreground">
            Access is restricted and administrative activity will be recorded.
          </p>
        </div>
      </section>
    </main>
  );
}

function LoginFeature({
  icon: Icon,
  label,
}: {
  icon: typeof Server;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-background/35 px-3 py-3 text-xs text-muted-foreground">
      <Icon className="size-3.5 text-primary" />
      {label}
    </div>
  );
}
