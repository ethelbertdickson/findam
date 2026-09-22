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
  ChevronLeft,
  ChevronRight,
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
  Play,
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
  deleteMediaAsset,
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [galleryAssetId, setGalleryAssetId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<MediaAsset['kind'] | ''>('');
  const [formatFilter, setFormatFilter] = useState('');
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
      setSelectedIds([]);
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

  const visibleAssets = assets.filter((asset) => {
    const formatMatches = !formatFilter || asset.mimeType.split('/')[1]?.toUpperCase() === formatFilter;
    return (!kindFilter || asset.kind === kindFilter) && formatMatches;
  });
  const availableFormats = Array.from(new Set(assets.map((asset) => asset.mimeType.split('/')[1]?.toUpperCase()).filter(Boolean))).sort();

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

  async function onDeleteAsset(asset: MediaAsset) {
    if (!window.confirm(`Delete “${asset.originalFilename}”? This removes the stored file.`)) return;
    try {
      await deleteMediaAsset(asset.id, csrfToken);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="sticky top-0 z-30 mb-4 flex flex-col justify-between gap-4 border-b border-border/70 bg-background/95 py-4 backdrop-blur sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            Media library
          </h1>
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
          <div className="flex flex-col gap-3 border-b border-border/70 p-4">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Type a name, tag, or metadata to find assets…"
                className="h-11 pl-9 text-base"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect aria-label="Filter by folder" value={folderPath} onChange={(event) => setFolderPath(event.target.value)}>
                <NativeSelectOption value="">Folders</NativeSelectOption>
                {folders.map((folder) => <NativeSelectOption key={folder.id} value={folder.path}>{folder.path} ({folder._count.assets})</NativeSelectOption>)}
              </NativeSelect>
              <NativeSelect aria-label="Filter by format" value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}>
                <NativeSelectOption value="">Formats</NativeSelectOption>
                {availableFormats.map((format) => <NativeSelectOption key={format} value={format}>{format}</NativeSelectOption>)}
              </NativeSelect>
              <NativeSelect aria-label="Filter by asset type" value={kindFilter} onChange={(event) => setKindFilter(event.target.value as MediaAsset['kind'] | '')}>
                <NativeSelectOption value="">Asset types</NativeSelectOption>
                <NativeSelectOption value="IMAGE">Images</NativeSelectOption>
                <NativeSelectOption value="VIDEO">Videos</NativeSelectOption>
                <NativeSelectOption value="DOCUMENT">Documents</NativeSelectOption>
              </NativeSelect>
              <span className="ml-auto text-xs text-muted-foreground">{visibleAssets.length} shown</span>
            </div>
            <div className="flex items-center self-end rounded-lg border border-border/80 p-1" aria-label="Media display mode">
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
          {selectedIds.length ? (
            <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm">
              <span className="text-muted-foreground">
                {selectedIds.length} asset{selectedIds.length === 1 ? '' : 's'} selected
              </span>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (!window.confirm(`Delete ${selectedIds.length} selected asset${selectedIds.length === 1 ? '' : 's'}?`)) return;
                  void (async () => {
                    try {
                      await Promise.all(selectedIds.map((id) => deleteMediaAsset(id, csrfToken)));
                      setSelectedIds([]);
                      await load();
                    } catch (caught) {
                      setError(errorMessage(caught));
                    }
                  })();
                }}
              >
                <Trash2 />
                Delete selected
              </Button>
            </div>
          ) : null}
          {loading && !assets.length ? (
            <div className="grid min-h-80 place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : assets.length ? (
            <div
              className={
                viewMode === 'list'
                  ? 'divide-y divide-border/70'
                  : viewMode === 'mosaic'
                    ? 'grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4'
                    : 'grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
              }
            >
              {viewMode === 'list' ? <div className="hidden grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_90px_80px_90px_100px_90px_90px_72px] gap-4 bg-muted/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid"><span>Display name</span><span>Containing folder</span><span>Asset type</span><span>Format</span><span>Size</span><span>Dimensions</span><span>Delivery</span><span>Access</span><span /></div> : null}
              {visibleAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  viewMode={viewMode}
                  selected={selectedIds.includes(asset.id)}
                  onToggleSelect={() => setSelectedIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id])}
                  onPreview={() => setGalleryAssetId(asset.id)}
                  onDelete={() => void onDeleteAsset(asset)}
                />
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
      {galleryAssetId ? (
        <AssetGallery
          assets={visibleAssets}
          activeId={galleryAssetId}
          onClose={() => setGalleryAssetId(null)}
          onChange={setGalleryAssetId}
          onDelete={(asset) => void onDeleteAsset(asset)}
        />
      ) : null}
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
  selected,
  onToggleSelect,
  onPreview,
  onDelete,
}: {
  asset: MediaAsset;
  viewMode: 'list' | 'cards' | 'mosaic';
  compact?: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [dimensions, setDimensions] = useState('—');
  const [duration, setDuration] = useState<number | null>(null);
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
  const imageClass = viewMode === 'cards'
    ? 'size-full object-contain p-3'
    : viewMode === 'mosaic'
      ? 'size-full object-contain p-1'
      : 'size-full object-contain';
  const imagePreview = asset.kind === 'IMAGE' ? (
    // oxlint-disable-next-line next/no-img-element -- media assets are dynamic records served by the media service.
    <img src={asset.urlPath} alt={asset.originalFilename} className={imageClass} onLoad={(event) => setDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)} />
  ) : <Icon className="size-7 text-muted-foreground" />;
  const videoMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (video.videoWidth && video.videoHeight)
      setDimensions(`${video.videoWidth} × ${video.videoHeight}`);
    if (Number.isFinite(video.duration)) setDuration(video.duration);
  };
  const durationLabel = duration !== null ? formatDuration(duration) : '—';
  if (viewMode === 'list') {
    return (
      <article className={`group relative grid grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_90px_80px_90px_100px_90px_90px_72px] items-center gap-4 px-4 py-3 hover:bg-muted/20 ${selected ? 'bg-primary/8 ring-1 ring-inset ring-primary/35' : ''}`}>
        <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted/40">
          {asset.kind === 'IMAGE' ? <button type="button" className="size-full" onClick={onPreview} aria-label="Enlarge image">{imagePreview}</button> : asset.kind === 'VIDEO' ? <button type="button" className="relative size-full" onClick={onPreview} aria-label="Play video"><video src={asset.urlPath} poster={asset.thumbnailPath} className="size-full object-cover" preload="metadata" muted playsInline onLoadedMetadata={videoMetadata} onLoadedData={videoMetadata} /><span className="pointer-events-none absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white"><Play className="ml-0.5 size-3.5 fill-current" /></span></button> : <Icon className="size-5 text-muted-foreground" />}
        </div>
        <button type="button" className="min-w-0 cursor-pointer text-left" onClick={onToggleSelect} aria-label={`${selected ? 'Deselect' : 'Select'} ${asset.originalFilename}`}><p className="truncate text-sm font-medium">{asset.originalFilename}</p><p className="truncate text-xs text-muted-foreground">{asset.id}</p></button>
        </div>
        <button type="button" className="truncate text-left text-xs text-muted-foreground" onClick={onToggleSelect}>{asset.folder?.path ?? 'Unfiled'}</button>
        <button type="button" className="text-left text-xs capitalize text-muted-foreground" onClick={onToggleSelect}>{asset.kind.toLowerCase()}</button>
        <button type="button" className="text-left text-xs uppercase text-muted-foreground" onClick={onToggleSelect}>{asset.mimeType.split('/')[1] ?? '—'}</button>
        <button type="button" className="text-left text-xs text-muted-foreground" onClick={onToggleSelect}>{formatBytes(asset.sizeBytes)}</button>
        <button type="button" className="text-left text-xs text-muted-foreground" onClick={onToggleSelect}>{dimensions}</button>
        <button type="button" className="text-left text-xs text-muted-foreground" onClick={onToggleSelect}>Upload</button>
        <button type="button" className="text-left text-xs text-muted-foreground" onClick={onToggleSelect}>Public</button>
        <AssetActions asset={asset} copied={copied} onCopy={copyUrl} onDelete={onDelete} inline />
      </article>
    );
  }
  return (
    <article className={`group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background/30 ${selected ? 'border-primary ring-2 ring-primary/25' : 'border-border/80'} ${viewMode === 'cards' ? 'h-[394px]' : viewMode === 'mosaic' ? 'aspect-[4/3]' : ''}`}>
      <div className={`relative grid min-h-0 place-items-center bg-muted/40 ${viewMode === 'cards' ? 'h-[326px] flex-none' : viewMode === 'mosaic' ? 'flex-1' : 'p-3 aspect-[4/3]'}`}>
          {asset.kind === 'IMAGE' ? <button type="button" className="size-full" onClick={onPreview} aria-label="Enlarge image">{imagePreview}</button> : asset.kind === 'VIDEO' ? <button type="button" className="group/video relative size-full" onClick={onPreview} aria-label="Play video"><video src={asset.urlPath} poster={asset.thumbnailPath} className={imageClass} preload="metadata" muted playsInline onLoadedMetadata={videoMetadata} onLoadedData={videoMetadata} /><span className="pointer-events-none absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white shadow-lg ring-1 ring-white/40 transition-transform group-hover/video:scale-105"><Play className="ml-0.5 size-5 fill-current" /></span></button> : <Icon className="size-7 text-muted-foreground" />}
        <AssetActions asset={asset} copied={copied} onCopy={copyUrl} onDelete={onDelete} />
        {viewMode === 'mosaic' ? <button type="button" onClick={(event) => { event.stopPropagation(); onToggleSelect(); }} aria-label={`${selected ? 'Deselect' : 'Select'} ${asset.originalFilename}`} className={`absolute left-2 top-2 z-10 grid size-8 place-items-center rounded-md border text-white shadow-sm backdrop-blur-sm ${selected ? 'border-primary bg-primary' : 'border-white/40 bg-black/55 hover:bg-black/75'}`}>{selected ? <Check className="size-4" /> : null}</button> : null}
        {viewMode === 'cards' ? <button type="button" onClick={() => setDetailsOpen((open) => !open)} aria-label="Show asset metadata" data-tooltip="Show metadata" className="media-tooltip absolute bottom-2 right-2 z-10 grid size-7 place-items-center rounded-full bg-black/65 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-black/85"><Info className="size-3.5" /></button> : null}
        {detailsOpen ? <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/65 p-4 text-xs text-white backdrop-blur-[2px]"><p className="truncate font-medium">{asset.originalFilename}</p><p className="mt-1">{format} · {dimensions}{asset.kind === 'VIDEO' ? ` · ${durationLabel}` : ''}</p><p className="mt-1">{formatBytes(asset.sizeBytes)} · Upload · Public</p><p className="mt-1 truncate text-white/70">{asset.folder?.path ?? 'Unfiled'}</p><button type="button" onClick={() => setDetailsOpen(false)} className="mt-3 self-start text-[11px] underline underline-offset-2">Close details</button></div> : null}
      </div>
      <div
        className={viewMode === 'mosaic' ? 'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-white opacity-0 transition-opacity group-hover:opacity-100' : compact ? 'hidden' : `flex h-[68px] flex-none flex-col justify-start gap-1 border-t border-border/70 p-3 ${viewMode === 'cards' ? 'cursor-pointer' : ''}`}
        onClick={viewMode === 'cards' ? onToggleSelect : undefined}
        onKeyDown={viewMode === 'cards' ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggleSelect(); } } : undefined}
        role={viewMode === 'cards' ? 'button' : undefined}
        tabIndex={viewMode === 'cards' ? 0 : undefined}
        aria-label={viewMode === 'cards' ? `${selected ? 'Deselect' : 'Select'} ${asset.originalFilename}` : undefined}
      >
        <p className="truncate text-sm font-medium" title={asset.originalFilename}>{asset.originalFilename}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{asset.kind === 'VIDEO' ? 'VIDEO' : format}</span><span>{asset.kind === 'VIDEO' ? format : dimensions}</span>{asset.kind === 'VIDEO' ? <><span>{dimensions}</span><span>{durationLabel}</span></> : null}<span>{formatBytes(asset.sizeBytes)}</span><Globe2 className="ml-auto size-3.5 shrink-0" aria-label="Public" /></div>
      </div>
    </article>
  );
}

function AssetGallery({
  assets,
  activeId,
  onClose,
  onChange,
  onDelete,
}: {
  assets: MediaAsset[];
  activeId: string;
  onClose: () => void;
  onChange: (id: string) => void;
  onDelete: (asset: MediaAsset) => void;
}) {
  const activeIndex = Math.max(0, assets.findIndex((asset) => asset.id === activeId));
  const asset = assets[activeIndex];
  const touchStartX = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState('—');
  const [duration, setDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDimensions('—');
    setDuration(null);
    setCopied(false);
  }, [activeId]);

  if (!asset) return null;
  const previous = assets[(activeIndex - 1 + assets.length) % assets.length];
  const next = assets[(activeIndex + 1) % assets.length];
  const format = asset.mimeType.split('/')[1]?.toUpperCase() ?? '—';
  const durationLabel = duration !== null ? formatDuration(duration) : '—';

  async function copyUrl() {
    await navigator.clipboard.writeText(new URL(asset.urlPath, window.location.origin).href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function showPrevious() {
    if (assets.length > 1) onChange(previous.id);
  }
  function showNext() {
    if (assets.length > 1) onChange(next.id);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPrevious();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, assets, onClose]);

  return (
    <dialog
      open
      className="fixed inset-0 z-[100] m-0 flex h-full w-full flex-col border-0 bg-black/90 p-4 text-white backdrop-blur-sm sm:p-6"
      aria-label={`${asset.originalFilename} preview`}
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(distance) > 50) distance > 0 ? showPrevious() : showNext();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium sm:text-base">{asset.originalFilename}</p>
          <p className="text-xs text-white/60">{activeIndex + 1} of {assets.length}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close preview" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-3 py-4">
        <button type="button" onClick={showPrevious} disabled={assets.length < 2} aria-label="Previous asset" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 disabled:opacity-30 hover:bg-white/20"><ChevronLeft /></button>
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 items-center justify-center">
          {asset.kind === 'VIDEO' ? (
            <video
              key={asset.id}
              src={asset.urlPath}
              poster={asset.thumbnailPath}
              controls
              autoPlay
              playsInline
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                if (video.videoWidth && video.videoHeight) setDimensions(`${video.videoWidth} × ${video.videoHeight}`);
                if (Number.isFinite(video.duration)) setDuration(video.duration);
              }}
              onLoadedData={(event) => {
                const video = event.currentTarget;
                if (video.videoWidth && video.videoHeight) setDimensions(`${video.videoWidth} × ${video.videoHeight}`);
                if (Number.isFinite(video.duration)) setDuration(video.duration);
              }}
              className="max-h-full max-w-full object-contain"
            />
          ) : asset.kind === 'IMAGE' ? (
            // oxlint-disable-next-line next/no-img-element -- media assets are dynamic records served by the media service.
            <img key={asset.id} src={asset.urlPath} alt={asset.originalFilename} onLoad={(event) => setDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)} className="max-h-full max-w-full object-contain" />
          ) : <FileText className="size-16 text-white/60" />}
          <AssetActions asset={asset} copied={copied} onCopy={copyUrl} onDelete={() => onDelete(asset)} forceVisible />
        </div>
        <button type="button" onClick={showNext} disabled={assets.length < 2} aria-label="Next asset" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 disabled:opacity-30 hover:bg-white/20"><ChevronRight /></button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/65">
        <span>{format}</span><span>{dimensions}</span>{asset.kind === 'VIDEO' ? <span>{durationLabel}</span> : null}<span>{formatBytes(asset.sizeBytes)}</span><span>{asset.folder?.path ?? 'Unfiled'}</span>
      </div>
    </dialog>
  );
}

function AssetActions({ asset, copied, onCopy, onDelete, inline = false, forceVisible = false }: { asset: MediaAsset; copied: boolean; onCopy: () => Promise<void>; onDelete: () => void; inline?: boolean; forceVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const disabledActions = [
    ['Download', Download],
    ['Rename', Pencil],
    ['Replace', Replace],
    ['Add to collection', FolderPlus],
  ] as const;
  return (
    <div className={`${inline ? 'relative justify-end' : 'absolute right-2 top-2'} z-10 flex gap-1 ${forceVisible ? '' : 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'}`}>
      <button type="button" onClick={() => void onCopy()} aria-label="Copy media URL" data-tooltip={copied ? 'Copied' : 'Copy URL'} className="media-tooltip grid size-8 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-black/85">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
      <div className="relative">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-label="More media actions" data-tooltip="More actions" className="media-tooltip grid size-8 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-black/85"><MoreVertical className="size-4" /></button>
        {open ? <div className={`absolute right-0 top-9 flex gap-1 rounded-full bg-background/75 p-1 shadow-xl backdrop-blur-sm ${inline ? 'flex-row' : 'flex-col'}`}>
          <a href={asset.urlPath} target="_blank" rel="noreferrer" aria-label="Open asset" data-tooltip="Open asset" className="media-tooltip grid size-8 place-items-center rounded-full text-foreground hover:bg-muted"><ExternalLink className="size-3.5" /></a>
          <button type="button" onClick={() => void onCopy()} aria-label="Copy URL" data-tooltip="Copy URL" className="media-tooltip grid size-8 place-items-center rounded-full text-foreground hover:bg-muted"><Copy className="size-3.5" /></button>
          <button type="button" onClick={() => { setOpen(false); void shareAsset(); }} aria-label="Share asset" data-tooltip="Share asset" className="media-tooltip grid size-8 place-items-center rounded-full text-foreground hover:bg-muted"><Share2 className="size-3.5" /></button>
          <button type="button" onClick={() => { setOpen(false); onDelete(); }} aria-label="Delete media" data-tooltip="Delete media" className="media-tooltip grid size-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
          {disabledActions.map(([label, ActionIcon]) => <button key={label} type="button" disabled aria-label={`${label} (coming soon)`} data-tooltip={`${label} (coming soon)`} className="media-tooltip grid size-8 place-items-center rounded-full text-muted-foreground opacity-40"><ActionIcon className="size-3.5" /></button>)}
        </div> : null}
      </div>
    </div>
  );

  async function shareAsset() {
    const url = new URL(asset.urlPath, window.location.origin).href;
    if (navigator.share) {
      await navigator.share({ title: asset.originalFilename, url }).catch(() => undefined);
      return;
    }
    await onCopy();
  }
}
function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDuration(value: number) {
  const totalSeconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The media request could not be completed.';
}
