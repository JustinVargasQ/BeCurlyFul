import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS as LOCAL_PRODUCTS, CATEGORIES } from '../../data/products';
import { formatCRC } from '../../lib/currency';
import api, { assetUrl } from '../../lib/api';
import useToastStore from '../../store/toastStore';

const USE_API = import.meta.env.VITE_API_URL;

function useAdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const toast      = useToastStore();
  const askConfirm = useToastStore((s) => s.askConfirm);

  const load = useCallback(async () => {
    setLoading(true);
    if (!USE_API) { setProducts(LOCAL_PRODUCTS); setLoading(false); return; }
    try {
      const { data } = await api.get('/products/admin/all');
      setProducts(data.products || []);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => {
    if (!USE_API) return;
    try {
      const { data } = await api.patch(`/products/${id}/toggle`);
      setProducts((prev) => prev.map((p) => ((p._id || p.id) === id ? data : p)));
      toast.success(data.isActive ? 'Producto activado' : 'Producto desactivado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const remove = async (id, name) => {
    const ok = await askConfirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    if (!USE_API) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
      toast.success('Producto eliminado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  return { products, loading, load, toggle, remove };
}

/* ── Auto-tag bulk button ──
 *   1. Click → llama /admin/auto-tag?dryRun=true → preview de qué se agregaría
 *   2. Modal con conteo + lista resumida → admin confirma
 *   3. Llama /admin/auto-tag (apply) → toast + refresh
 */
function AutoTagButton({ onDone }) {
  const [busy, setBusy]     = useState(false);
  const [preview, setPreview] = useState(null);
  const toast = useToastStore();

  const runPreview = async () => {
    if (!USE_API) { toast.error('Backend no conectado'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/products/admin/auto-tag?dryRun=true');
      if (!data.preview || data.preview.length === 0) {
        toast.success('Todos los productos ya están etiquetados ✨');
        return;
      }
      setPreview(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo previsualizar');
    } finally { setBusy(false); }
  };

  const apply = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/products/admin/auto-tag');
      toast.success(`${data.updated} producto${data.updated === 1 ? '' : 's'} etiquetado${data.updated === 1 ? '' : 's'}`);
      setPreview(null);
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo aplicar');
    } finally { setBusy(false); }
  };

  return (
    <>
      <button
        type="button"
        onClick={runPreview}
        disabled={busy}
        title="Sugiere etiquetas para todos los productos según su nombre. No sobreescribe lo que ya tagueaste."
        className="flex items-center gap-2 bg-white border border-cream-200 hover:border-rose-300 text-ink-700 hover:text-rose-600 font-bold px-3.5 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap disabled:opacity-50">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        {busy ? 'Analizando…' : 'Auto-etiquetar'}
      </button>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-cream-100">
              <h3 className="font-display text-lg font-semibold text-ink-900">Sugerencias de etiquetas</h3>
              <p className="text-sm text-ink-500 mt-0.5">
                Se van a agregar etiquetas a <strong className="text-rose-600">{preview.preview.length}</strong> producto{preview.preview.length === 1 ? '' : 's'}.
                Las etiquetas existentes no se tocan.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-ink-400 border-b border-cream-100">
                  <tr>
                    <th className="text-left py-2 font-bold">Producto</th>
                    <th className="text-left py-2 font-bold">Se agregarán</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row) => (
                    <tr key={row.id} className="border-b border-cream-50">
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-ink-800 truncate max-w-[260px]">{row.name}</div>
                        <div className="text-[10px] text-ink-400 uppercase">{row.category}</div>
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.added.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-semibold border border-rose-100">+ {t}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-cream-100 flex items-center justify-end gap-2">
              <button onClick={() => setPreview(null)} disabled={busy}
                className="px-4 py-2 text-sm font-bold text-ink-500 hover:text-ink-700 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={apply} disabled={busy}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                {busy ? 'Aplicando…' : `Aplicar a ${preview.preview.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Bulk CSV import ──
 * Pegás un CSV / TSV o subís un archivo, ves un preview con qué se va a crear
 * vs actualizar, y aplicás. La merge es no-destructiva en tags. */
function parseCsvText(text) {
  if (!text) return [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  // Detectar delimitador: prioriza coma, después tab, después punto-coma
  const firstLine = lines[0];
  let delim = ',';
  if (!firstLine.includes(',') && firstLine.includes('\t')) delim = '\t';
  else if (!firstLine.includes(',') && firstLine.includes(';')) delim = ';';

  // Parser tolerante: respeta comillas dobles para campos con delim adentro
  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i += 1; }
        else inQ = !inQ;
      } else if (c === delim && !inQ) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return row;
  }).filter((r) => r.name || r.nombre);
}

function BulkImportButton({ onDone }) {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy]       = useState(false);
  const toast = useToastStore();

  const tryPreview = async () => {
    if (!USE_API) { toast.error('Backend no conectado'); return; }
    const rows = parseCsvText(text);
    if (rows.length === 0) {
      toast.error('No se detectaron filas. Verificá que la primera fila sean los encabezados.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/products/admin/bulk-import?dryRun=true', { rows });
      setPreview(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo previsualizar');
    } finally { setBusy(false); }
  };

  const apply = async () => {
    setBusy(true);
    try {
      const rows = parseCsvText(text);
      const { data } = await api.post('/products/admin/bulk-import', { rows });
      toast.success(`${data.created} creados · ${data.updated} actualizados${data.skipped ? ` · ${data.skipped} con error` : ''}`);
      setOpen(false); setText(''); setPreview(null);
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo importar');
    } finally { setBusy(false); }
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setText(String(e.target.result || ''));
    reader.readAsText(file, 'utf-8');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Importá productos desde un CSV / Excel pegado o como archivo. Crea o actualiza por slug."
        className="flex items-center gap-2 bg-white border border-cream-200 hover:border-rose-300 text-ink-700 hover:text-rose-600 font-bold px-3.5 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Importar CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-cream-100 flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-ink-900">Importar productos desde CSV</h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  Columnas requeridas: <code className="px-1 bg-cream-100 rounded text-ink-700">name</code>,
                  <code className="px-1 bg-cream-100 rounded text-ink-700 ml-1">brand</code>,
                  <code className="px-1 bg-cream-100 rounded text-ink-700 ml-1">category</code>,
                  <code className="px-1 bg-cream-100 rounded text-ink-700 ml-1">price</code>.
                  Opcionales: <code className="px-1 bg-cream-100 rounded ml-1">slug</code>,
                  <code className="px-1 bg-cream-100 rounded ml-1">oldPrice</code>,
                  <code className="px-1 bg-cream-100 rounded ml-1">description</code>,
                  <code className="px-1 bg-cream-100 rounded ml-1">stock</code>,
                  <code className="px-1 bg-cream-100 rounded ml-1">tags</code> (separados por coma),
                  <code className="px-1 bg-cream-100 rounded ml-1">badge</code>.
                </p>
                <p className="text-xs text-ink-500 mt-1">
                  Si el slug ya existe → <strong>actualiza</strong>. Si no → <strong>crea</strong>.
                  Las etiquetas se suman a las existentes.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-300 hover:text-ink-700 -mt-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="text-xs flex-1" />
                <button
                  onClick={() => setText('name,brand,category,price,oldPrice,description,stock,tags,badge\nLabial mate rojo,Beauty Creations,labios,3500,4000,Mate de larga duración,12,"labial,mate,rojo",NUEVO\nCrema hidratante,The Ordinary,skincare,8900,,Hidratación 24h,5,"crema,hidratante,natural",')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-cream-100 hover:bg-cream-200 text-ink-600 font-semibold">
                  Cargar plantilla
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setPreview(null); }}
                placeholder="Pegá tu CSV/TSV acá. Primera fila = encabezados."
                rows={10}
                className="w-full font-mono text-xs border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />

              {preview && (
                <div className="bg-cream-50 rounded-xl border border-cream-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-cream-200 flex flex-wrap gap-3 text-xs font-bold">
                    <span className="text-emerald-700">✓ {preview.created} crear</span>
                    <span className="text-blue-700">↻ {preview.updated} actualizar</span>
                    {preview.skipped > 0 && <span className="text-amber-700">⚠ {preview.skipped} omitir</span>}
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {preview.details.slice(0, 50).map((d, i) => (
                          <tr key={i} className="border-b border-cream-100 last:border-0">
                            <td className="px-3 py-1.5 w-8 text-ink-400 tabular-nums">{d.row}</td>
                            <td className="px-3 py-1.5 truncate max-w-[280px] text-ink-800">{d.name}</td>
                            <td className="px-3 py-1.5 text-right">
                              {d.action === 'created'  && <span className="text-emerald-600 font-bold">crear</span>}
                              {d.action === 'updated'  && <span className="text-blue-600 font-bold">actualizar</span>}
                              {d.action === 'skipped'  && <span className="text-amber-600 font-bold">omitir</span>}
                              {d.action === 'error'    && <span className="text-red-600 font-bold" title={d.error}>error</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.errors?.length > 0 && (
                    <div className="px-4 py-2 border-t border-cream-200 text-xs text-amber-700 max-h-24 overflow-y-auto">
                      {preview.errors.slice(0, 5).map((e, i) => (
                        <p key={i}>Fila {e.row}: {e.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-cream-100 flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={busy}
                className="px-4 py-2 text-sm font-bold text-ink-500 hover:text-ink-700">
                Cancelar
              </button>
              {!preview ? (
                <button onClick={tryPreview} disabled={busy || !text.trim()}
                  className="px-4 py-2 bg-ink-900 hover:bg-ink-800 text-white text-sm font-bold rounded-xl disabled:opacity-50">
                  {busy ? 'Analizando…' : 'Previsualizar'}
                </button>
              ) : (
                <button onClick={apply} disabled={busy || (preview.created === 0 && preview.updated === 0)}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl disabled:opacity-50">
                  {busy ? 'Importando…' : `Importar ${preview.created + preview.updated}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Skeleton row ── */
function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-cream-100 rounded animate-pulse" style={{ width: ['60%','40%','30%','25%','20%','15%'][i] }} />
        </td>
      ))}
    </tr>
  );
}

/* ── Product row — desktop ── */
function ProductRow({ p, toggle, remove }) {
  const img      = assetUrl(p.images?.[0] || p.img || '');
  const category = p.category || p.cat;
  const isActive = p.isActive !== false;
  const id       = p._id || p.id;

  return (
    <tr className={`hover:bg-cream-50/60 transition-colors border-b border-cream-100 last:border-0 ${!isActive ? 'opacity-50' : ''}`}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          {img
            ? <img src={img} alt={p.name} className="w-10 h-10 object-cover rounded-xl flex-shrink-0 border border-cream-200" />
            : <div className="w-10 h-10 rounded-xl bg-cream-100 flex-shrink-0 flex items-center justify-center text-ink-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
          }
          <div className="min-w-0">
            <p className="font-semibold text-ink-900 text-sm truncate max-w-[180px]">{p.name}</p>
            <p className="text-xs text-ink-400">{p.brand}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <span className="px-2.5 py-1 bg-cream-100 text-ink-600 rounded-full text-xs font-medium capitalize">{category}</span>
      </td>
      <td className="px-4 py-3.5">
        <p className="font-bold text-ink-900 text-sm whitespace-nowrap">{formatCRC(p.price)}</p>
        {p.oldPrice && <p className="text-xs text-ink-300 line-through">{formatCRC(p.oldPrice)}</p>}
      </td>
      <td className="px-4 py-3.5 hidden xl:table-cell">
        {typeof p.stock === 'number'
          ? <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              p.stock === 0 ? 'bg-red-50 text-red-600' : p.stock <= 5 ? 'bg-yellow-50 text-yellow-700' : 'bg-cream-100 text-ink-600'
            }`}>
              {p.stock === 0 ? 'Agotado' : `${p.stock} un.`}
            </span>
          : <span className="text-xs text-ink-300">—</span>}
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <button onClick={() => toggle(id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-ink-400'}`} />
          {isActive ? 'Activo' : 'Inactivo'}
        </button>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-0.5">
          <Link to={`/producto/${p.slug}`} target="_blank"
            className="p-2 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Ver en tienda">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </Link>
          <Link to={`/admin/productos/${id}/editar`}
            className="p-2 text-ink-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </Link>
          <Link to={`/admin/productos/nuevo?from=${id}`}
            className="p-2 text-ink-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-all" title="Duplicar producto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </Link>
          <button onClick={() => remove(id, p.name)}
            className="p-2 text-ink-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Product card — mobile ── */
function ProductCard({ p, toggle, remove }) {
  const img      = assetUrl(p.images?.[0] || p.img || '');
  const category = p.category || p.cat;
  const isActive = p.isActive !== false;
  const id       = p._id || p.id;

  return (
    <div className={`bg-white rounded-2xl border border-cream-100 shadow-card p-4 flex gap-3 ${!isActive ? 'opacity-60' : ''}`}>
      {img
        ? <img src={img} alt={p.name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0 border border-cream-100" />
        : <div className="w-14 h-14 rounded-xl bg-cream-100 flex-shrink-0 flex items-center justify-center text-ink-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="font-semibold text-ink-900 text-sm leading-tight line-clamp-2">{p.name}</p>
          <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            isActive ? 'bg-green-50 text-green-700' : 'bg-ink-100 text-ink-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-ink-400'}`} />
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <p className="text-xs text-ink-400 mb-1">{p.brand} · <span className="capitalize">{category}</span></p>
        <div className="flex items-center gap-2">
          <p className="font-bold text-ink-900 text-sm">{formatCRC(p.price)}</p>
          {typeof p.stock === 'number' && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              p.stock === 0 ? 'bg-red-50 text-red-600' : p.stock <= 5 ? 'bg-yellow-50 text-yellow-700' : 'bg-cream-100 text-ink-500'
            }`}>
              {p.stock === 0 ? 'Agotado' : `Stock ${p.stock}`}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 items-center justify-center pl-2 border-l border-cream-100">
        <Link to={`/producto/${p.slug}`} target="_blank"
          className="p-2 text-ink-300 hover:text-rose-500 rounded-lg transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </Link>
        <Link to={`/admin/productos/${id}/editar`}
          className="p-2 text-ink-300 hover:text-blue-500 rounded-lg transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </Link>
        <button onClick={() => remove(id, p.name)}
          className="p-2 text-ink-300 hover:text-red-500 rounded-lg transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
}

function generateCatalog(products) {
  const fmt = (n) => `₡${Number(n || 0).toLocaleString('es-CR')}`;
  const active = products.filter((p) => p.isActive !== false);

  const cards = active.map((p) => {
    const img = p.images?.[0] || p.img || '';
    const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    return `<div style="border:1px solid #eee;border-radius:12px;overflow:hidden;break-inside:avoid">
      ${img ? `<img src="${img}" alt="${p.name}" style="width:100%;height:160px;object-fit:cover">` : `<div style="width:100%;height:160px;background:#f5f0f0;display:flex;align-items:center;justify-content:center;color:#ccc"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`}
      <div style="padding:12px">
        <p style="font-size:10px;color:#B85F72;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 2px">${p.brand || ''}</p>
        <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 6px;line-height:1.3">${p.name}</p>
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:15px;font-weight:bold;color:#111">${fmt(p.price)}</span>
          ${p.oldPrice ? `<span style="font-size:11px;color:#999;text-decoration:line-through">${fmt(p.oldPrice)}</span>` : ''}
          ${discount > 0 ? `<span style="font-size:10px;font-weight:bold;color:#B85F72;background:#FBF0F2;padding:1px 5px;border-radius:20px">-${discount}%</span>` : ''}
        </div>
        ${typeof p.stock === 'number' && p.stock === 0 ? `<p style="font-size:10px;color:#ef4444;margin:4px 0 0">Agotado</p>` : ''}
      </div>
    </div>`;
  }).join('');

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="utf-8"><title>Catálogo JD Virtual</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:24px;color:#111;background:#fff}
      .header{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #B85F72}
      .title{font-size:28px;font-weight:bold;color:#B85F72}
      .subtitle{color:#888;font-size:13px;margin-top:4px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
      .print-btn{display:block;margin:24px auto 0;padding:10px 28px;background:#B85F72;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer}
      @media print{.print-btn{display:none!important}body{padding:12px}.grid{grid-template-columns:repeat(3,1fr);gap:10px}}
    </style>
  </head><body>
    <div class="header">
      <div class="title">JD Virtual Store</div>
      <div class="subtitle">Catálogo de productos · ${new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      <div class="subtitle">${active.length} productos disponibles</div>
    </div>
    <div class="grid">${cards}</div>
    <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  </body></html>`);
  w.document.close();
}

const STOCK_FILTERS = [
  { key: 'todos',      label: 'Todos'      },
  { key: 'activos',    label: 'Activos'    },
  { key: 'inactivos',  label: 'Inactivos'  },
  { key: 'stock-bajo', label: 'Stock bajo' },
  { key: 'agotados',   label: 'Agotados'   },
];

const SORT_OPTIONS = [
  { value: '',           label: 'Orden por defecto' },
  { value: 'nombre-az',  label: 'Nombre A → Z'      },
  { value: 'precio-asc', label: 'Precio: menor ↑'   },
  { value: 'precio-desc',label: 'Precio: mayor ↓'   },
  { value: 'stock-asc',  label: 'Stock: menor primero'},
];

export default function AdminProducts() {
  const [search, setSearch]           = useState('');
  const [cat, setCat]                 = useState('todos');
  const [stockFilter, setStockFilter] = useState('todos');
  const [sort, setSort]               = useState('');
  const [tagFilter, setTagFilter]     = useState([]);
  const { products, loading, load, toggle, remove } = useAdminProducts();

  // Universe of tags actually used across the catalog — sorted by frequency
  const tagCounts = (() => {
    const counts = new Map();
    for (const p of products) {
      for (const t of (p.tags || [])) {
        if (!t) continue;
        const k = String(t).toLowerCase().trim();
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  })();

  const toggleTag = (t) =>
    setTagFilter((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const activeCount    = products.filter(p => p.isActive !== false).length;
  const outOfStock     = products.filter(p => p.stock === 0).length;
  const lowStock       = products.filter(p => typeof p.stock === 'number' && p.stock > 0 && p.stock <= 5).length;
  const inactiveCount  = products.filter(p => p.isActive === false).length;

  const filtered = products
    .filter((p) => {
      const isActive = p.isActive !== false;
      const matchCat = cat === 'todos' || (p.category || p.cat) === cat;
      const matchQ   = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(search.toLowerCase());
      const matchStock =
        stockFilter === 'todos'      ? true
        : stockFilter === 'activos'   ? isActive
        : stockFilter === 'inactivos' ? !isActive
        : stockFilter === 'stock-bajo'? (typeof p.stock === 'number' && p.stock > 0 && p.stock <= 5)
        : stockFilter === 'agotados'  ? p.stock === 0
        : true;
      // Tag filter: AND semantics — el producto debe tener TODOS los tags marcados
      const productTags = (p.tags || []).map((t) => String(t).toLowerCase());
      const matchTags = tagFilter.length === 0 || tagFilter.every((t) => productTags.includes(t));
      return matchCat && matchQ && matchStock && matchTags;
    })
    .sort((a, b) => {
      if (sort === 'nombre-az')  return a.name.localeCompare(b.name, 'es');
      if (sort === 'precio-asc') return a.price - b.price;
      if (sort === 'precio-desc')return b.price - a.price;
      if (sort === 'stock-asc')  return (a.stock ?? Infinity) - (b.stock ?? Infinity);
      return 0;
    });

  const hasFilters = search || cat !== 'todos' || stockFilter !== 'todos' || sort || tagFilter.length > 0;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 leading-none">Productos</h1>
          <p className="text-ink-400 text-sm mt-1">{activeCount} activos · {products.length} en total</p>
        </div>
        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <button onClick={() => generateCatalog(products)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-cream-200 text-ink-600 hover:bg-cream-50 transition-colors bg-white shadow-sm whitespace-nowrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Catálogo PDF
            </button>
          )}
          <BulkImportButton onDone={load} />
          <AutoTagButton onDone={load} />
          <Link to="/admin/productos/nuevo"
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-btn whitespace-nowrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo producto
          </Link>
        </div>
      </div>

      {/* Mini stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: products.length, color: 'text-ink-900',   bg: 'bg-cream-50',   border: 'border-cream-200' },
          { label: 'Activos',    value: activeCount,     color: 'text-green-700', bg: 'bg-green-50',   border: 'border-green-100' },
          { label: 'Stock bajo', value: lowStock,        color: 'text-amber-700', bg: 'bg-amber-50',   border: 'border-amber-100' },
          { label: 'Agotados',   value: outOfStock,      color: 'text-red-600',   bg: 'bg-red-50',     border: 'border-red-100'   },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl px-4 py-3 flex items-center justify-between`}>
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">{s.label}</span>
            <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-4 space-y-3">
        {/* Row 1: search + sort */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o marca..."
              className="w-full pl-9 pr-4 border border-cream-200 rounded-xl py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white" />
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="10" y2="14"/><line x1="21" y1="18" x2="10" y2="18"/></svg>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="pl-8 pr-4 border border-cream-200 rounded-xl py-2.5 text-sm text-ink-700 focus:outline-none focus:border-rose-400 cursor-pointer bg-white appearance-none min-w-[190px]">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: category pills */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider self-center mr-1">Categoría:</span>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                cat === c
                  ? 'bg-ink-900 text-white'
                  : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
              }`}>
              {c === 'todos' ? 'Todas' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {/* Row 3: stock filter pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider mr-1">Estado:</span>
          {STOCK_FILTERS.map((f) => {
            const counts = {
              todos: products.length,
              activos: activeCount,
              inactivos: inactiveCount,
              'stock-bajo': lowStock,
              agotados: outOfStock,
            };
            const dotColor = {
              todos: '', activos: 'bg-green-500', inactivos: 'bg-ink-400',
              'stock-bajo': 'bg-amber-500', agotados: 'bg-red-500',
            }[f.key];
            return (
              <button key={f.key} onClick={() => setStockFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                  stockFilter === f.key
                    ? 'bg-rose-500 text-white'
                    : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                }`}>
                {dotColor && <span className={`w-1.5 h-1.5 rounded-full ${stockFilter === f.key ? 'bg-white' : dotColor}`} />}
                {f.label}
                <span className={`ml-0.5 text-[10px] font-bold ${stockFilter === f.key ? 'text-white/80' : 'text-ink-400'}`}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}

          {hasFilters && (
            <button onClick={() => { setSearch(''); setCat('todos'); setStockFilter('todos'); setSort(''); setTagFilter([]); }}
              className="ml-auto text-xs text-ink-400 hover:text-rose-500 font-semibold transition-colors flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              Limpiar
            </button>
          )}
        </div>

        {/* Row 4: tag filter — solo se muestra si hay tags en el catálogo */}
        {tagCounts.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center pt-2 border-t border-cream-50">
            <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider self-center mr-1">Etiquetas:</span>
            {tagCounts.slice(0, 20).map(([t, count]) => {
              const isOn = tagFilter.includes(t);
              return (
                <button key={t} onClick={() => toggleTag(t)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                    isOn
                      ? 'bg-rose-500 text-white'
                      : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                  }`}>
                  {isOn && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {t}
                  <span className={`text-[9px] font-bold ${isOn ? 'text-white/80' : 'text-ink-400'}`}>{count}</span>
                </button>
              );
            })}
            {tagFilter.length > 0 && (
              <button onClick={() => setTagFilter([])}
                className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold ml-1">
                Quitar todos
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-cream-100 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-50 border-b border-cream-200">
              <th className="text-left px-5 py-3.5 text-[11px] font-bold text-ink-400 uppercase tracking-widest">Producto</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-bold text-ink-400 uppercase tracking-widest hidden md:table-cell">Categoría</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-bold text-ink-400 uppercase tracking-widest">Precio</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-bold text-ink-400 uppercase tracking-widest hidden xl:table-cell">Stock</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-bold text-ink-400 uppercase tracking-widest hidden lg:table-cell">Estado</th>
              <th className="px-4 py-3.5 text-[11px] font-bold text-ink-400 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
                ? <tr><td colSpan={6} className="text-center py-14 text-ink-400">No se encontraron productos.</td></tr>
                : filtered.map((p) => <ProductRow key={p._id || p.id} p={p} toggle={toggle} remove={remove} />)
            }
          </tbody>
        </table>
        {!loading && (
          <div className="px-5 py-3 border-t border-cream-100 text-xs text-ink-400 flex items-center justify-between">
            <span>Mostrando <strong className="text-ink-700">{filtered.length}</strong> de <strong className="text-ink-700">{products.length}</strong> productos</span>
            {filtered.length !== products.length && (
              <span className="text-rose-500 font-medium">{products.length - filtered.length} filtrados</span>
            )}
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-cream-100 shadow-card p-4 flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-cream-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-cream-100 animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-cream-100 animate-pulse rounded w-1/2" />
                  <div className="h-3.5 bg-cream-100 animate-pulse rounded w-1/4" />
                </div>
              </div>
            ))
          : filtered.length === 0
            ? <div className="text-center py-12 text-ink-400">No se encontraron productos.</div>
            : filtered.map((p) => <ProductCard key={p._id || p.id} p={p} toggle={toggle} remove={remove} />)
        }
        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-ink-400 py-1">{filtered.length} de {products.length} productos</p>
        )}
      </div>
    </div>
  );
}
