import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type ProductStatus = 'healthy' | 'degraded' | 'down' | 'not_configured';
interface ProductSnapshot {
  id: string;
  name: string;
  status: ProductStatus;
  fetchedAt: string;
  users?: { total?: number; active?: number };
  usage?: { requests?: number; errors?: number; errorRatePercent?: number };
  error?: string;
}
interface ProductResponse { generatedAt: string; products: ProductSnapshot[] }

const placeholders: ProductSnapshot[] = [
  { id: 'findam', name: 'Findam', status: 'not_configured', fetchedAt: '' },
  { id: 'marketlist', name: 'MarketList', status: 'not_configured', fetchedAt: '' },
  { id: 'projectorpro', name: 'Projector Pro', status: 'not_configured', fetchedAt: '' },
];

function App() {
  const [data, setData] = useState<ProductResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/control/products', { credentials: 'include' });
      if (!response.ok) throw new Error(`Control Centre returned HTTP ${response.status}.`);
      setData((await response.json()) as ProductResponse);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Control Centre is unavailable.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 30_000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, [load]);

  const products = data?.products ?? [];
  const healthy = products.filter((product) => product.status === 'healthy').length;
  const configured = products.filter((product) => product.status !== 'not_configured').length;
  return <div className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">G</span><div><strong>Grasta Domhan</strong><span>Control Centre</span></div></div><button className="refresh" type="button" disabled={loading} onClick={() => void load()}>{loading ? 'Refreshing…' : 'Refresh'}</button></header>
    <main>
      <section className="intro"><div><p className="eyebrow">Central operations</p><h1>Product overview</h1><p>Independent products, one operational view.</p></div><span className="timestamp">{data ? `Updated ${new Date(data.generatedAt).toLocaleTimeString()}` : 'Waiting for connector data'}</span></section>
      {error ? <div className="notice error">{error}</div> : null}
      <section className="summary-grid"><Summary label="Healthy products" value={`${healthy}/${products.length || 3}`} /><Summary label="Configured connectors" value={`${configured}/3`} /><Summary label="Last refresh" value={data ? new Date(data.generatedAt).toLocaleTimeString() : '—'} /></section>
      <section className="product-grid" aria-label="Product connectors">{(products.length ? products : placeholders).map((product) => <ProductCard key={product.id} product={product} />)}</section>
    </main>
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="summary-card"><span>{label}</span><strong>{value}</strong></div>; }
function ProductCard({ product }: { product: ProductSnapshot }) {
  const statusLabel = product.status === 'not_configured' ? 'Not configured' : product.status;
  return <article className="product-card"><div className="card-heading"><div><p className="eyebrow">Product connector</p><h2>{product.name}</h2></div><span className={`status ${product.status}`}>{statusLabel}</span></div><p className="card-copy">{product.error ?? 'Operational metrics are available through the product API.'}</p><div className="card-metrics"><Metric label="Users" value={product.users?.total == null ? '—' : format(product.users.total)} /><Metric label="Requests" value={product.usage?.requests == null ? '—' : format(product.usage.requests)} /><Metric label="Errors" value={product.usage?.errors == null ? '—' : format(product.usage.errors)} /></div></article>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function format(value: number) { return new Intl.NumberFormat().format(value); }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
