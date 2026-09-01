import { type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  FolderKanban,
  KeyRound,
  Loader2,
  Plus,
  ShieldOff,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/features/auth/admin-auth';
import {
  createMediaProject,
  createProjectApiKey,
  getMediaProjects,
  revokeProjectApiKey,
  type CreatedMediaApiKey,
  type MediaApiKey,
  type MediaProject,
} from './media-api';

export function MediaProjectsPage({
  recoverSession,
  csrfToken,
}: {
  recoverSession: () => Promise<boolean>;
  csrfToken: string;
}) {
  const [projects, setProjects] = useState<MediaProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [keyProject, setKeyProject] = useState<MediaProject | null>(null);
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedMediaApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{
    project: MediaProject;
    key: MediaApiKey;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await getMediaProjects());
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status === 401 &&
        (await recoverSession())
      ) {
        try {
          setProjects(await getMediaProjects());
          return;
        } catch (retryError) {
          setError(errorMessage(retryError));
          return;
        }
      }
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [recoverSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function onCreateProject(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName.trim()) return;
    setError(null);
    try {
      await createMediaProject(
        {
          name: projectName.trim(),
          description: projectDescription.trim() || undefined,
        },
        csrfToken,
      );
      setProjectName('');
      setProjectDescription('');
      setProjectDialogOpen(false);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function onCreateKey(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!keyProject || !keyName.trim()) return;
    setError(null);
    try {
      setCreatedKey(
        await createProjectApiKey(keyProject.id, keyName.trim(), csrfToken),
      );
      setKeyName('');
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function onRevokeKey() {
    if (!revokeTarget) return;
    setError(null);
    try {
      await revokeProjectApiKey(
        revokeTarget.project.id,
        revokeTarget.key.id,
        csrfToken,
      );
      setRevokeTarget(null);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function copyCreatedKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function closeKeyDialog(open: boolean) {
    if (open) return;
    setKeyProject(null);
    setCreatedKey(null);
    setKeyName('');
    setCopied(false);
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <FolderKanban className="size-3.5" /> Isolated application storage
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            Media projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrators create projects and issue scoped keys to trusted
            apps.
          </p>
        </div>
        <Button size="sm" onClick={() => setProjectDialogOpen(true)}>
          <Plus /> New project
        </Button>
      </section>

      {error ? (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          <p className="flex-1">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading && !projects.length ? (
        <div className="grid min-h-80 place-items-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="border-border/80 bg-card/72 shadow-none ring-0"
            >
              <CardHeader className="border-b border-border/70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{project.name}</CardTitle>
                      <Badge variant="outline">{project.slug}</Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {project.description || 'No project description'}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setKeyProject(project)}
                  >
                    <KeyRound /> New key
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 border-b border-border/70 text-sm">
                  <div className="border-r border-border/70 p-4">
                    <p className="text-xs text-muted-foreground">Assets</p>
                    <p className="mt-1 text-xl font-semibold">
                      {project._count.assets.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground">Folders</p>
                    <p className="mt-1 text-xl font-semibold">
                      {project._count.folders.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    API keys
                  </p>
                  <div className="space-y-2">
                    {project.apiKeys.length ? (
                      project.apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2"
                        >
                          <KeyRound className="size-4 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {key.name}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {key.prefix}••••{key.lastFour}
                            </p>
                          </div>
                          {key.revokedAt ? (
                            <Badge variant="outline">Revoked</Badge>
                          ) : (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Revoke ${key.name}`}
                              onClick={() => setRevokeTarget({ project, key })}
                            >
                              <ShieldOff />
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-border/80 px-3 py-5 text-center text-xs text-muted-foreground">
                        No API keys issued yet.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <form onSubmit={onCreateProject}>
            <DialogHeader>
              <DialogTitle>Create media project</DialogTitle>
              <DialogDescription>
                Create this once, then issue keys to the app that owns it.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <Input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Project name, e.g. ProjectorPro"
              />
              <Input
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Short description (optional)"
              />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit">Create project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(keyProject)} onOpenChange={closeKeyDialog}>
        <DialogContent className="sm:max-w-lg">
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Copy this API key now</DialogTitle>
                <DialogDescription>
                  For security, the full key will not be shown again after this
                  dialog closes.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-primary/25 bg-primary/8 p-3">
                <code className="block break-all text-xs">
                  {createdKey.key}
                </code>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => void copyCreatedKey()}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Copied' : 'Copy key'}
                </Button>
                <Button onClick={() => closeKeyDialog(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={onCreateKey}>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  This key will only upload media to {keyProject?.name}.
                </DialogDescription>
              </DialogHeader>
              <Input
                className="my-4"
                value={keyName}
                onChange={(event) => setKeyName(event.target.value)}
                placeholder="Key name, e.g. Production mobile app"
              />
              <DialogFooter showCloseButton>
                <Button type="submit">Generate key</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.key.name} will immediately stop authorizing new
              uploads. Existing media will remain available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void onRevokeKey()}
            >
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The media project request could not be completed.';
}
