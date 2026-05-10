import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { optimizedImage } from '../../lib/api';
import { formatCRC } from '../../lib/currency';
import useCart from '../../hooks/useCart';
import useToastStore from '../../store/toastStore';

const CATEGORIES = [
  { key: 'maquillaje', label: 'Maquillaje', emoji: '💄' },
  { key: 'skincare',   label: 'Skincare',   emoji: '🧴' },
  { key: 'cabello',    label: 'Cabello',    emoji: '💇' },
  { key: 'mix',        label: 'Variado',    emoji: '✨' },
];

const PRESET_BUDGETS = [5000, 10000, 15000, 20000, 30000];

/* keyOf — resolver el id del producto independientemente de cómo viene */
const idOf = (p) => String(p?.id || p?._id || p?.slug || '');

export default function KitBuilder() {
  const [budget, setBudget]       = useState(15000);
  const [category, setCategory]   = useState('maquillaje');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [selections, setSelections] = useState({}); // { subtypeKey: productId }
  const { addItem, openCart }     = useCart();
  const toastSuccess              = useToastStore((s) => s.success);

  // Fetch options cuando cambia category o budget
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(`/products/kit-options?cat=${category}&budget=${budget}&limit=3`)
      .then(({ data }) => {
        if (cancelled) return;
        setData(data);
        // Reset selecciones: si ya tenía elegido algo que no está en la nueva
        // grilla, lo descarta
        setSelections((prev) => {
          const next = {};
          for (const sub of (data.subtypes || [])) {
            if (prev[sub.key] && sub.options.some((o) => idOf(o) === prev[sub.key])) {
              next[sub.key] = prev[sub.key];
            }
          }
          return next;
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'No se pudieron cargar opciones');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, budget]);

  // Mapa de productos seleccionados (para cálculo y render)
  const selectedProducts = useMemo(() => {
    if (!data?.subtypes) return [];
    const out = [];
    for (const sub of data.subtypes) {
      const id = selections[sub.key];
      if (!id) continue;
      const p = sub.options.find((o) => idOf(o) === id);
      if (p) out.push({ ...p, _subtypeKey: sub.key, _subtypeLabel: sub.label });
    }
    return out;
  }, [data, selections]);

  const total = selectedProducts.reduce((s, p) => s + p.price, 0);
  const remaining = budget - total;
  const overBudget = remaining < 0;
  const progress = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  const toggleSelect = (subKey, productId) => {
    setSelections((prev) => {
      // Si ya está seleccionado el mismo, deseleccionar; sino, reemplazar
      if (prev[subKey] === productId) {
        const { [subKey]: _, ...rest } = prev;
        return rest;
      }
      // Verificar que el producto entra en el presupuesto restante
      const product = data?.subtypes
        ?.find((s) => s.key === subKey)
        ?.options.find((o) => idOf(o) === productId);
      if (!product) return prev;
      const currentlySelectedInThisSubtype = prev[subKey];
      const subtypePrev = currentlySelectedInThisSubtype
        ? (data.subtypes.find((s) => s.key === subKey)?.options.find((o) => idOf(o) === currentlySelectedInThisSubtype)?.price || 0)
        : 0;
      const projectedTotal = total - subtypePrev + product.price;
      if (projectedTotal > budget) {
        // No bloqueamos pero advertimos visualmente
      }
      return { ...prev, [subKey]: productId };
    });
  };

  const handleAddAll = () => {
    if (selectedProducts.length === 0) return;
    selectedProducts.forEach((p) => addItem(p, 1));
    toastSuccess(`${selectedProducts.length} producto${selectedProducts.length === 1 ? '' : 's'} agregado${selectedProducts.length === 1 ? '' : 's'} al carrito`);
    openCart();
  };

  return (
    <section className="relative bg-gradient-to-br from-cream-50 via-white to-rose-50/40 py-16 sm:py-20 overflow-hidden">
      {/* Decorative orbs */}
      <div aria-hidden className="pointer-events-none absolute top-12 -right-20 w-72 h-72 rounded-full bg-rose-300/15 blur-3xl animate-orb-pulse" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-gold/15 blur-3xl animate-orb-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="section-label">🎁 Kit Builder</span>
          <h2 className="section-title">
            Armá tu kit{' '}
            <span className="italic" style={{
              background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              perfecto
            </span>
          </h2>
          <p className="text-ink-500 mt-3 max-w-xl mx-auto">
            Decinos tu presupuesto y armá tu set de esenciales. Eligiendo de a uno, vas viendo
            cuánto te queda 💕
          </p>
        </div>

        {/* Controls card */}
        <div className="bg-white rounded-3xl border border-cream-200 p-5 sm:p-6 shadow-card mb-6">
          {/* Budget */}
          <div className="mb-5">
            <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2 block">
              Tu presupuesto
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <span className="text-2xl font-display font-bold text-ink-900">₡</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="flex-1 text-2xl font-display font-bold text-ink-900 bg-transparent border-b-2 border-cream-200 focus:border-rose-400 focus:outline-none py-1 transition-colors"
                  step="500"
                  min="0"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_BUDGETS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      budget === b
                        ? 'bg-rose-500 text-white'
                        : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                    }`}>
                    ₡{(b / 1000).toLocaleString('es-CR')}k
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2 block">
              Categoría
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${
                    category === c.key
                      ? 'bg-ink-900 text-white shadow-md'
                      : 'bg-cream-100 text-ink-700 hover:bg-cream-200'
                  }`}>
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subtypes grid */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-cream-100 p-4 animate-pulse">
                <div className="h-4 w-32 bg-cream-100 rounded mb-3" />
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(3)].map((__, j) => (
                    <div key={j} className="aspect-[3/4] bg-cream-100 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : data?.subtypes?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-200 p-10 text-center">
            <p className="text-ink-400">No hay opciones para ese presupuesto y categoría 🥺</p>
            <p className="text-xs text-ink-400 mt-2">Probá con otra categoría o subiendo el presupuesto.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.subtypes?.map((sub) => {
              const hasOptions = sub.options.length > 0;
              const selectedId = selections[sub.key];
              return (
                <div key={sub.key} className="bg-white rounded-2xl border border-cream-100 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sub.emoji}</span>
                      <h3 className="font-display text-lg font-bold text-ink-900">{sub.label}</h3>
                      {selectedId && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ elegido
                        </span>
                      )}
                    </div>
                    {!hasOptions && (
                      <span className="text-xs text-ink-400">Sin opciones en este rango</span>
                    )}
                  </div>

                  {hasOptions && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {sub.options.map((p) => {
                        const id = idOf(p);
                        const isSelected = selectedId === id;
                        const img = p.images?.[0] || '';
                        return (
                          <motion.button
                            key={id}
                            onClick={() => toggleSelect(sub.key, id)}
                            whileTap={{ scale: 0.97 }}
                            className={`relative text-left rounded-xl overflow-hidden border-2 transition-all ${
                              isSelected
                                ? 'border-rose-500 shadow-card-hover'
                                : 'border-cream-200 hover:border-rose-300 hover:shadow-card'
                            }`}>
                            <div className="aspect-[4/3] bg-cream-50 overflow-hidden">
                              {img
                                ? <img src={optimizedImage(img, 300)} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                : <div className="w-full h-full bg-cream-200" />}
                              {isSelected && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="absolute inset-0 bg-rose-500/15 flex items-center justify-center pointer-events-none">
                                  <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                            <div className="p-2.5">
                              <p className="text-[11px] text-ink-400 uppercase tracking-wider truncate">{p.brand}</p>
                              <p className="text-xs font-semibold text-ink-900 line-clamp-2 leading-tight mt-0.5 min-h-[2.5em]">{p.name}</p>
                              <p className="text-sm font-bold text-rose-600 mt-1">{formatCRC(p.price)}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky progress bar + total */}
        <motion.div
          initial={false}
          animate={selectedProducts.length > 0 ? { y: 0, opacity: 1 } : { y: 16, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 240 }}
          className={`sticky bottom-4 mt-6 ${selectedProducts.length === 0 ? 'pointer-events-none' : ''}`}>
          <div className="bg-white rounded-2xl border border-cream-200 shadow-modal p-4 sm:p-5">
            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-ink-500 uppercase tracking-widest">Tu kit</span>
                <span className={`text-xs font-bold ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                  {overBudget
                    ? `Te pasaste por ${formatCRC(-remaining)}`
                    : remaining > 0
                      ? `Te quedan ${formatCRC(remaining)}`
                      : '¡Justo!'}
                </span>
              </div>
              <div className="h-2.5 bg-cream-100 rounded-full overflow-hidden relative">
                <motion.div
                  initial={false}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                  className={`h-full rounded-full ${overBudget ? 'bg-red-500' : ''}`}
                  style={overBudget
                    ? undefined
                    : { background: 'linear-gradient(90deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)' }}
                />
                {overBudget && (
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '100%' }}
                    className="absolute inset-0 h-full rounded-full bg-red-500/20 animate-pulse"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-ink-500">
                  {selectedProducts.length} producto{selectedProducts.length === 1 ? '' : 's'} seleccionado{selectedProducts.length === 1 ? '' : 's'}
                </p>
                <p className="font-display text-2xl font-bold text-ink-900 leading-none mt-0.5">
                  {formatCRC(total)} <span className="text-sm text-ink-400 font-normal">de {formatCRC(budget)}</span>
                </p>
              </div>
              <button
                onClick={handleAddAll}
                disabled={selectedProducts.length === 0 || overBudget}
                className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-btn hover:shadow-btn-hover"
                style={{
                  background: overBudget
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)',
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Agregar al carrito
              </button>
            </div>

            {/* Mini lista de seleccionados */}
            <AnimatePresence initial={false}>
              {selectedProducts.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden">
                  <div className="mt-3 pt-3 border-t border-cream-100 flex flex-wrap gap-1.5">
                    {selectedProducts.map((p) => (
                      <span key={idOf(p)} className="inline-flex items-center gap-1 text-[11px] bg-cream-50 border border-cream-200 rounded-full pl-2 pr-1 py-0.5">
                        <span className="text-ink-700 font-semibold">{p._subtypeLabel}:</span>
                        <span className="text-ink-500 truncate max-w-[120px]">{p.name}</span>
                        <button
                          onClick={() => toggleSelect(p._subtypeKey, idOf(p))}
                          className="w-4 h-4 rounded-full bg-ink-200 hover:bg-rose-500 hover:text-white text-ink-500 flex items-center justify-center text-[10px] font-bold transition-colors">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
