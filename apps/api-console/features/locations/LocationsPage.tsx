import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ApiError, apiRequest } from '@/features/auth/admin-auth';

type RecoverSession = () => Promise<boolean>;
type LocationItem = { id: string; name: string; code?: string | null };

function getLocations(path: string) {
  return apiRequest<LocationItem[]>(path);
}

export function AdminLocationsPage({ recoverSession }: { recoverSession: RecoverSession }) {
  const [countries, setCountries] = useState<LocationItem[]>([]);
  const [states, setStates] = useState<LocationItem[]>([]);
  const [cities, setCities] = useState<LocationItem[]>([]);
  const [areas, setAreas] = useState<LocationItem[]>([]);
  const [countryId, setCountryId] = useState('');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async function request<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401 && (await recoverSession())) {
        return work();
      }
      throw caught;
    }
  }, [recoverSession]);

  useEffect(() => {
    void request(() => getLocations('/locations/countries'))
      .then(setCountries)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load countries.'))
      .finally(() => setLoading(false));
  }, [request]);

  async function selectCountry(id: string) {
    setCountryId(id); setStateId(''); setCityId(''); setStates([]); setCities([]); setAreas([]);
    if (!id) return;
    try { setStates(await request(() => getLocations(`/locations/countries/${id}/states`))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load states.'); }
  }
  async function selectState(id: string) {
    setStateId(id); setCityId(''); setCities([]); setAreas([]);
    if (!id) return;
    try { setCities(await request(() => getLocations(`/locations/states/${id}/cities`))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load cities.'); }
  }
  async function selectCity(id: string) {
    setCityId(id); setAreas([]);
    if (!id) return;
    try { setAreas(await request(() => getLocations(`/locations/cities/${id}/areas`))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load areas.'); }
  }

  const selected = (items: LocationItem[], id: string) => items.find((item) => item.id === id)?.name;
  const path = [selected(countries, countryId), selected(states, stateId), selected(cities, cityId)].filter(Boolean);

  return <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <section className="mb-6 flex items-start gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><MapPin className="size-5" /></div>
      <div><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Locations</h1><Badge variant="outline">Read-only</Badge></div><p className="mt-1 text-sm text-muted-foreground">Browse the location hierarchy used by Findam listings.</p></div>
    </section>
    <Card className="border-border/80 bg-card/72 shadow-none ring-0">
      <CardHeader className="border-b border-border/70"><CardTitle className="text-base">Location browser</CardTitle><p className="text-sm text-muted-foreground">Select a country, state, and city to inspect its areas.</p></CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        {error ? <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"><AlertTriangle className="size-4 text-destructive" /><span className="flex-1">{error}</span><Button size="sm" variant="outline" onClick={() => window.location.reload()}><RefreshCw className="mr-2 size-3.5" />Retry</Button></div> : null}
        {loading ? <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading countries…</div> : <>
          <div className="grid gap-3 md:grid-cols-3">
            <NativeSelect aria-label="Country" value={countryId} onChange={(event) => void selectCountry(event.target.value)}><NativeSelectOption value="">Country</NativeSelectOption>{countries.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}{item.code ? ` (${item.code})` : ''}</NativeSelectOption>)}</NativeSelect>
            <NativeSelect aria-label="State" value={stateId} disabled={!countryId} onChange={(event) => void selectState(event.target.value)}><NativeSelectOption value="">State</NativeSelectOption>{states.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect>
            <NativeSelect aria-label="City" value={cityId} disabled={!stateId} onChange={(event) => void selectCity(event.target.value)}><NativeSelectOption value="">City</NativeSelectOption>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Path</span><ChevronRight className="size-4" />{path.length ? path.map((part, index) => <span key={`${part}-${index}`} className="flex items-center gap-2">{index ? <ChevronRight className="size-3" /> : null}<span>{part}</span></span>) : <span>Select a location above</span>}</div>
          {cityId ? <div><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium">Areas</h2><Badge variant="secondary">{areas.length}</Badge></div>{areas.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{areas.map((area) => <div key={area.id} className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm">{area.name}</div>)}</div> : <p className="text-sm text-muted-foreground">No areas are recorded for this city yet.</p>}</div> : null}
        </>}
      </CardContent>
    </Card>
  </main>;
}
