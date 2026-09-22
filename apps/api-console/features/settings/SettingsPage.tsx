import { useState } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminSession } from '@/features/auth/admin-auth';
import { ConsoleHeaderSlot } from '@/app/ConsoleHeaderSlot';

export function SettingsPage({ session }: { session: AdminSession }) {
  const [saved, setSaved] = useState(false);
  const [liveRefresh, setLiveRefresh] = useState(() => localStorage.getItem('findam-console-live-refresh') !== 'off');

  function savePreferences() {
    localStorage.setItem('findam-console-live-refresh', liveRefresh ? 'on' : 'off');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return <>
    <ConsoleHeaderSlot>
      <Button size="sm" onClick={savePreferences}>{saved ? <><Check className="mr-2 size-4" />Saved</> : 'Save preferences'}</Button>
    </ConsoleHeaderSlot>
    <main className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/80 bg-card/72 shadow-none ring-0"><CardHeader><CardTitle className="text-base">Account</CardTitle><CardDescription>Your administrator identity for this console.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Name</span><span className="font-medium">{session.user.firstName} {session.user.lastName}</span></div><div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Email</span><span className="font-medium">{session.user.email}</span></div><div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Role</span><Badge variant="outline">Administrator</Badge></div></CardContent></Card>
      <Card className="border-border/80 bg-card/72 shadow-none ring-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal className="size-4 text-primary" />Console preferences</CardTitle><CardDescription>These settings are stored in this browser.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex items-start justify-between gap-4"><span><span className="block text-sm font-medium">Live dashboard refresh</span><span className="mt-1 block text-xs text-muted-foreground">Refresh dashboard data automatically while this console is open.</span></span><input aria-label="Live dashboard refresh" type="checkbox" className="mt-1 size-4 accent-primary" checked={liveRefresh} onChange={(event) => setLiveRefresh(event.target.checked)} /></div></CardContent></Card>
    </div>
    </main>
  </>;
}
