import {
  type ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  FileText,
  FolderPlus,
  Image,
  Loader2,
  Search,
  Upload,
  Video,
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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { ApiError } from '@/features/auth/admin-auth';
import {
  createMediaFolder,
  getMediaAssets,
  getMediaFolders,
  getMediaProjects,
  uploadMediaAsset,
  type MediaAsset,
  type MediaFolder,
  type MediaProject,
} from './media-api';

export function MediaLibraryPage({
  recoverSession,
  csrfToken,
}: {
  recoverSession: () => Promise<boolean>;
  csrfToken: string;
}) {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [projects, setProjects] = useState<MediaProject[]>([]);
  const [projectSlug, setProjectSlug] = useState('findam');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectResult, folderResult, assetResult] = await Promise.all([
        getMediaProjects(),
        getMediaFolders(projectSlug),
        getMediaAssets({ projectSlug, q: search.trim(), folderPath }),
      ]);
      setProjects(projectResult);
      setFolders(folderResult);
      setAssets(assetResult.items);
      setTotal(assetResult.total);
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status === 401 &&
        (await recoverSession())
      ) {
        try {
          const [projectResult, folderResult, assetResult] = await Promise.all([
            getMediaProjects(),
            getMediaFolders(projectSlug),
            getMediaAssets({ projectSlug, q: search.trim(), folderPath }),
          ]);
          setProjects(projectResult);
          setFolders(folderResult);
          setAssets(assetResult.items);
          setTotal(assetResult.total);
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
  }, [folderPath, projectSlug, recoverSession, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadMediaAsset(file, folderPath, projectSlug, csrfToken);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  async function onCreateFolder(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderName.trim()) return;
    try {
      await createMediaFolder(
        folderName.trim(),
        folderPath,
        projectSlug,
        csrfToken,
      );
      setFolderName('');
      setFolderDialogOpen(false);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Image className="size-3.5" /> Local-first storage
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            Media library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Files live on the media service, while folders and metadata stay
            ready for future Findam apps.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            aria-label="Media project"
            value={projectSlug}
            onChange={(event) => {
              setFolderPath('');
              setProjectSlug(event.target.value);
            }}
          >
            {projects.map((project) => (
              <NativeSelectOption key={project.id} value={project.slug}>
                {project.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFolderDialogOpen(true)}
          >
            <FolderPlus />
            New folder
          </Button>
          <Button
            size="sm"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload />
            {uploading ? 'Uploading…' : 'Upload file'}
          </Button>
          <input
            ref={fileInput}
            className="hidden"
            type="file"
            accept="image/*,video/*,application/pdf"
            onChange={onFileSelected}
          />
        </div>
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
      <Card className="border-border/80 bg-card/72 shadow-none ring-0">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search media files"
                className="pl-9"
              />
            </div>
            <NativeSelect
              aria-label="Filter by folder"
              value={folderPath}
              onChange={(event) => setFolderPath(event.target.value)}
            >
              <NativeSelectOption value="">All folders</NativeSelectOption>
              {folders.map((folder) => (
                <NativeSelectOption key={folder.id} value={folder.path}>
                  {folder.path} ({folder._count.assets})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {loading && !assets.length ? (
            <div className="grid min-h-80 place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : assets.length ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {assets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center px-6 text-center">
              <div>
                <Image className="mx-auto size-7 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No media yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload an image, video, or PDF to create the first reusable
                  asset.
                </p>
              </div>
            </div>
          )}
          <div className="border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
            {total.toLocaleString()} stored asset{total === 1 ? '' : 's'}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <AlertDialogContent>
          <form onSubmit={onCreateFolder}>
            <AlertDialogHeader>
              <AlertDialogTitle>Create folder</AlertDialogTitle>
              <AlertDialogDescription>
                {folderPath
                  ? `This folder will be created inside “${folderPath}”.`
                  : 'Folders make assets easy to reuse across your apps.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              className="mt-4"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="e.g. listing-photos"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit">Create folder</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function AssetCard({ asset }: { asset: MediaAsset }) {
  const Icon =
    asset.kind === 'VIDEO'
      ? Video
      : asset.kind === 'DOCUMENT'
        ? FileText
        : Image;
  return (
    <article className="overflow-hidden rounded-xl border border-border/80 bg-background/30">
      <div className="grid aspect-[4/3] place-items-center bg-muted/40">
        {asset.kind === 'IMAGE' ? (
          // oxlint-disable-next-line next/no-img-element -- media assets are dynamic records served by the media service.
          <img src={asset.urlPath} alt="" className="size-full object-cover" />
        ) : (
          <Icon className="size-7 text-muted-foreground" />
        )}
      </div>
      <div className="p-3">
        <p
          className="truncate text-sm font-medium"
          title={asset.originalFilename}
        >
          {asset.originalFilename}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Badge variant="outline">{asset.kind.toLowerCase()}</Badge>
          <span className="text-[11px] text-muted-foreground">
            {formatBytes(asset.sizeBytes)}
          </span>
        </div>
        <p className="mt-2 truncate text-[11px] text-muted-foreground">
          {asset.folder?.path ?? 'Unfiled'}
        </p>
        <a
          href={asset.urlPath}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate text-[11px] text-primary underline-offset-2 hover:underline"
          title={asset.urlPath}
        >
          Open URL · {asset.urlPath}
        </a>
      </div>
    </article>
  );
}
function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The media request could not be completed.';
}
