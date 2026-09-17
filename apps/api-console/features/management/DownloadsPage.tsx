import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Globe2, RefreshCw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/features/auth/admin-auth';
import { getProjectorProDownloads, uploadAppRelease, type ProjectorProDownloadReport } from './admin-resources';

export function DownloadsPage({ recoverSession, csrfToken }: { recoverSession: () => Promise<boolean>; csrfToken: string }) {
  const [report, setReport] = useState<ProjectorProDownloadReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [app, setApp] = useState('projectorpro');
  const [platform, setPlatform] = useState('windows');
  const fileInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setReport(await getProjectorProDownloads()); }
    catch (caught) {
      if (caught instanceof ApiError && caught.status === 401 && await recoverSession()) { setReport(await getProjectorProDownloads()); }
      else setError(caught instanceof Error ? caught.message : 'Could not load download analytics.');
    } finally { setLoading(false); }
  }, [recoverSession]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30000); return () => window.clearInterval(timer); }, [load]);
  const count = (status: string) => report?.summary?.find((item) => item.status === status)?._count._all ?? 0;
  async function onUpload() {
    const file = fileInput.current?.files?.[0];
    if (!file) { fileInput.current?.click(); return; }
    await uploadFile(file);
  }
  async function uploadFile(file: File) {
    setUploading(true); setError(null);
    try { await uploadAppRelease(app, platform, file, csrfToken); if (fileInput.current) fileInput.current.value = ''; }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not upload the release.'); }
    finally { setUploading(false); }
  }
  return <div className="space-y-6 p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">ProjectorPro</p><h1 className="mt-2 text-2xl font-semibold">Download analytics</h1><p className="mt-1 text-sm text-muted-foreground">Track download starts and completed transfers.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh</Button></div>
    {error ? <p className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</p> : null}
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Downloads started" value={count('STARTED') + count('COMPLETED') + count('FAILED')} /><Metric label="Completed" value={count('COMPLETED')} /><Metric label="Failed / interrupted" value={count('FAILED')} /></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Upload className="size-4 text-primary" />App release files</CardTitle><p className="text-sm text-muted-foreground">Upload a release into its application and platform folder on the VPS.</p></CardHeader><CardContent className="flex flex-wrap items-center gap-3"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={app} onChange={(event) => setApp(event.target.value)}><option value="projectorpro">ProjectorPro</option><option value="findam">Findam</option><option value="marketlist">Marketlist</option></select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="windows">Windows</option><option value="linux">Linux</option><option value="macos">macOS</option></select><input ref={fileInput} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }} /><Button onClick={() => void onUpload()} disabled={uploading}>{uploading ? 'Uploading…' : 'Choose file and upload'}</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Downloads by platform</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3">{['windows', 'linux', 'macos'].map((name) => <div className="rounded-lg border px-3 py-3" key={name}><p className="text-sm capitalize text-muted-foreground">{name}</p><p className="mt-1 text-2xl font-semibold">{(report?.byPlatform?.filter((item) => item.platform === name).reduce((total, item) => total + item._count._all, 0) ?? 0).toLocaleString()}</p></div>)}</div></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Globe2 className="size-4 text-primary" />By country</CardTitle></CardHeader><CardContent>{report?.byCountry?.length ? <div className="space-y-3">{report.byCountry.map((item) => <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" key={`${item.countryCode}-${item.continent}`}><span>{item.countryCode ?? 'Unknown'} <span className="text-xs text-muted-foreground">{item.continent ?? ''}</span></span><Badge variant="outline">{item._count._all}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No location data recorded yet. Country detection uses the proxy’s country header when available.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Download className="size-4 text-primary" />Recent activity</CardTitle></CardHeader><CardContent>{report?.recent?.length ? <div className="max-h-96 space-y-2 overflow-auto">{report.recent.map((item) => <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm" key={item.id}><div><p className="font-medium">{item.status === 'COMPLETED' ? 'Completed' : item.status === 'FAILED' ? 'Failed' : 'Started'} · {item.version}</p><p className="text-xs text-muted-foreground">{item.countryCode ?? 'Unknown location'} · {item.platform ?? 'Unknown platform'} · IP fingerprint {item.ipHash ? item.ipHash.slice(0, 10) : 'unavailable'} · {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.startedAt))}</p></div><Badge variant={item.status === 'COMPLETED' ? 'default' : 'outline'}>{item.status}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No downloads recorded yet.</p>}</CardContent></Card></div>
  </div>;
}
function Metric({ label, value }: { label: string; value: number }) { return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p></CardContent></Card>; }
