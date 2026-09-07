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
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderPlus,
  Grid2X2,
  Globe2,
  Image,
  Info,
  LayoutGrid,
  Loader2,
  List,
  MoreVertical,
  Pencil,
  Replace,
  Search,
  Share2,
  Trash2,
  X,
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
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'mosaic'>(() =>
    (window.localStorage.getItem('findam-media-view') as 'list' | 'cards' | 'mosaic') || 'cards',
  );
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.localStorage.setItem('findam-media-view', viewMode);
  }, [viewMode]);

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
            <div className="flex items-center rounded-lg border border-border/80 p-1" aria-label="Media display mode">
              {([
                ['list', List, 'List view'],
                ['cards', Grid2X2, 'Card view'],
                ['mosaic', LayoutGrid, 'Mosaic view'],
              ] as const).map(([mode, Icon, label]) => (
                <Button
                  key={mode}
                  type="button"
                  size="icon"
                  variant={viewMode === mode ? 'secondary' : 'ghost'}
                  className={`${viewMode === mode ? 'size-8 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' : 'size-8 text-muted-foreground hover:text-foreground'} media-tooltip relative`}
                  aria-label={label}
                  aria-pressed={viewMode === mode}
                  data-tooltip={label}
                  onClick={() => setViewMode(mode)}
                >
                  <Icon />
                </Button>
              ))}
            </div>
          </div>
          {loading && !assets.length ? (
            <div className="grid min-h-80 place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : assets.length ? (
            <div className={viewMode === 'list' ? 'divide-y divide-border/70' : viewMode === 'mosaic' ? 'grid auto-flow-dense auto-rows-[240px] grid-cols-12 gap-4 p-4' : 'grid auto-flow-dense auto-rows-[430px] grid-cols-12 gap-4 p-4'}>
              {viewMode === 'list' ? <div className="hidden grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_90px_80px_90px_100px_90px_90px_72px] gap-4 bg-muted/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid"><span>Display name</span><span>Containing folder</span><span>Asset type</span><span>Format</span><span>Size</span><span>Dimensions</span><span>Delivery</span><span>Access</span><span /></div> : null}
              {assets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} viewMode={viewMode} />
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

function AssetCard({
  asset,
  viewMode,
  compact = false,
}: {
  asset: MediaAsset;
  viewMode: 'list' | 'cards' | 'mosaic';
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [dimensions, setDimensions] = useState('—');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const Icon =
    asset.kind === 'VIDEO'
      ? Video
      : asset.kind === 'DOCUMENT'
        ? FileText
        : Image;
  async function copyUrl() {
    await navigator.clipboard.writeText(new URL(asset.urlPath, window.location.origin).href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  const format = asset.mimeType.split('/')[1]?.toUpperCase() ?? '—';
  const parsedWidth = dimensions.includes('×') ? Number(dimensions.split('×')[0].trim()) : 0;
  const parsedHeight = dimensions.includes('×') ? Number(dimensions.split('×')[1].trim()) : 0;
  const ratio = parsedWidth && parsedHeight ? parsedWidth / parsedHeight : 1;
  const mosaicSpan = ratio >= 1.8 ? 6 : ratio >= 1.25 ? 4 : ratio >= 0.8 ? 3 : 2;
  const imagePreview = asset.kind === 'IMAGE' ? (
    // oxlint-disable-next-line next/no-img-element -- media assets are dynamic records served by the media service.
    <img src={asset.urlPath} alt={asset.originalFilename} className={`size-full ${viewMode === 'mosaic' || viewMode === 'cards' ? 'object-cover' : 'object-contain'}`} onLoad={(event) => setDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)} />
  ) : <Icon className="size-7 text-muted-foreground" />;
  if (viewMode === 'list') {
    return (
      <article className="group relative grid grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_90px_80px_90px_100px_90px_90px_72px] items-center gap-4 px-4 py-3 hover:bg-muted/20">
        <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted/40">
          {asset.kind === 'IMAGE' ? <button type="button" className="size-full" onClick={() => setPreviewOpen(true)} aria-label="Enlarge image">{imagePreview}</button> : <Icon className="size-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0"><p className="truncate text-sm font-medium">{asset.originalFilename}</p><p className="truncate text-xs text-muted-foreground">{asset.id}</p></div>
        </div>
        <span className="truncate text-xs text-muted-foreground">{asset.folder?.path ?? 'Unfiled'}</span>
        <span className="text-xs capitalize text-muted-foreground">{asset.kind.toLowerCase()}</span>
        <span className="text-xs uppercase text-muted-foreground">{asset.mimeType.split('/')[1] ?? '—'}</span>
        <span className="text-xs text-muted-foreground">{formatBytes(asset.sizeBytes)}</span>
        <span className="text-xs text-muted-foreground">{dimensions}</span>
        <span className="text-xs text-muted-foreground">Upload</span>
        <span className="text-xs text-muted-foreground">Public</span>
        <AssetActions asset={asset} copied={copied} onCopy={copyUrl} inline />
      </article>
    );
  }
  return (
    <article style={viewMode === 'mosaic' || viewMode === 'cards' ? { gridColumn: `span ${mosaicSpan} / span ${mosaicSpan}` } : undefined} className={`group relative flex flex-col overflow-hidden border border-border/80 bg-background/30 ${viewMode === 'cards' ? 'h-[430px]' : viewMode === 'mosaic' ? 'h-[240px]' : ''}`}>
      <div className={`relative grid min-h-0 place-items-center bg-muted/40 ${viewMode === 'cards' ? 'h-[326px] flex-none' : viewMode === 'mosaic' ? 'flex-1' : 'p-3 aspect-[4/3]'}`}>
        {asset.kind === 'IMAGE' ? <button type="button" className="size-full" onClick={() => setPreviewOpen(true)} aria-label="Enlarge image">{imagePreview}</button> : <Icon className="size-7 text-muted-foreground" />}
        <AssetActions asset={asset} copied={copied} onCopy={copyUrl} />
        {viewMode === 'cards' ? <button type="button" onClick={() => setDetailsOpen((open) => !open)} aria-label="Show asset metadata" data-tooltip="Show metadata" className="media-tooltip absolute bottom-2 right-2 z-10 grid size-7 place-items-center rounded-full bg-black/65 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-black/85"><Info className="size-3.5" /></button> : null}
        {detailsOpen ? <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/65 p-4 text-xs text-white backdrop-blur-[2px]"><p className="truncate font-medium">{asset.originalFilename}</p><p className="mt-1">{format} · {dimensions}</p><p className="mt-1">{formatBytes(asset.sizeBytes)} · Upload · Public</p><p className="mt-1 truncate text-white/70">{asset.folder?.path ?? 'Unfiled'}</p><button type="button" onClick={() => setDetailsOpen(false)} className="mt-3 self-start text-[11px] underline underline-offset-2">Close details</button></div> : null}
      </div>
      <div className={viewMode === 'mosaic' ? 'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-white opacity-0 transition-opacity group-hover:opacity-100' : compact ? 'hidden' : 'flex min-h-[104px] flex-none flex-col justify-center border-t border-border/70 p-3'}>
        <p
          className="truncate text-sm font-medium"
          title={asset.originalFilename}
        >
          {asset.originalFilename}
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground"><span>{format}</span><span>{dimensions}</span><span>{formatBytes(asset.sizeBytes)}</span><Globe2 className="ml-auto size-3.5" aria-label="Public" /></div>
      </div>
      {previewOpen ? (
        <dialog open className="fixed inset-0 z-[100] m-0 grid h-full w-full place-items-center border-0 bg-black/80 p-6" aria-label={asset.originalFilename}>
          <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close preview" data-tooltip="Close" className="media-tooltip absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"><X /></button>
          <div className="max-h-full max-w-5xl">
            {/* oxlint-disable-next-line next/no-img-element -- media assets are dynamic records served by the media service. */}
            <img src={asset.urlPath} alt={asset.originalFilename} className="max-h-[85vh] max-w-[90vw] object-contain" />
          </div>
        </dialog>
      ) : null}
    </article>
  );
}

function AssetActions({ asset, copied, onCopy, inline = false }: { asset: MediaAsset; copied: boolean; onCopy: () => Promise<void>; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const disabledActions = [
    ['Delete', Trash2],
    ['Download', Download],
    ['Rename', Pencil],
    ['Replace', Replace],
    ['Share', Share2],
    ['Add to collection', FolderPlus],
  ] as const;
  return (
    <div className={`${inline ? 'relative justify-end' : 'absolute right-2 top-2'} z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100`}>
      <button type="button" onClick={() => void onCopy()} aria-label="Copy media URL" data-tooltip={copied ? 'Copied' : 'Copy URL'} className="media-tooltip grid size-8 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-black/85">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
      <div className="relative">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-label="More media actions" data-tooltip="More actions" className="media-tooltip grid size-8 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-black/85"><MoreVertical className="size-4" /></button>
        {open ? <div className={`absolute right-0 top-9 flex gap-1 rounded-full bg-background/75 p-1 shadow-xl backdrop-blur-sm ${inline ? 'flex-row' : 'flex-col'}`}>
          <a href={asset.urlPath} target="_blank" rel="noreferrer" aria-label="Open asset" data-tooltip="Open asset" className="media-tooltip grid size-8 place-items-center rounded-full text-foreground hover:bg-muted"><ExternalLink className="size-3.5" /></a>
          <button type="button" onClick={() => void onCopy()} aria-label="Copy URL" data-tooltip="Copy URL" className="media-tooltip grid size-8 place-items-center rounded-full text-foreground hover:bg-muted"><Copy className="size-3.5" /></button>
          {disabledActions.map(([label, ActionIcon]) => <button key={label} type="button" disabled aria-label={`${label} (coming soon)`} data-tooltip={`${label} (coming soon)`} className="media-tooltip grid size-8 place-items-center rounded-full text-muted-foreground opacity-40"><ActionIcon className="size-3.5" /></button>)}
        </div> : null}
      </div>
    </div>
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
