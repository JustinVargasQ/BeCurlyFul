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

const idOf = (p) => String(p?.id || p?._id || p?.slug || '');
const pickKey = (cat, subKey) => `${cat}:${subKey}`;

export default function KitBuilder() {
  // Cerrado por default — el widget completo es grande, solo se despliega cuando
  // el usuario lo pide via el CTA. Asi la home no se siente "kilometrica" para
  // gente que ya sabe lo que quiere.
  const [isOpen, setIsOpen]       = useState(false);
  const [budget, setBudget]       = useState(15000);
  const [category, setCategory]   = useState('maquillaje');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  /* picks: { 'maquillaje:base': product, 'skincare:hidratante': product, ... }
   * Sobrevive el cambio de categoría — el usuario puede armar un kit que mezcla
   * picks de maquillaje + skincare + cabello sin perder nada. */
  const [picks, setPicks] = useState({});
  const { addItem, removeItem, openCart, items: cartItems } = useCart();
  const toastSuccess = useToastStore((s) => s.success);

  // Cargar opciones cuando cambia la categoría o el presupuesto. Solo cuando
  // el widget está abierto — no gastar bandwidth si el usuario nunca lo abre.
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(`/products/kit-options?cat=${category}&budget=${budget}&limit=3`)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.error || 'No se pudieron cargar opciones'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, budget, isOpen]);

  /* Click toggle: si el producto ya está pickeado lo saca del carrito y del
   * kit; si no, lo mete (y si había otro pickeado en ese slot, lo reemplaza). */
  const togglePick = (cat, subKey, subLabel, product) => {
    const key = pickKey(cat, subKey);
    const current = picks[key];
    const productId = idOf(product);

    setPicks((prev) => {
      const next = { ...prev };
      if (current && idOf(current) === productId) {
        // Mismo producto → deseleccionar
        delete next[key];
      } else {
        // Nuevo producto en este slot (puede haber un anterior, lo reemplazamos)
        next[key] = { ...product, _cat: cat, _subKey: subKey, _subLabel: subLabel };
      }
      return next;
    });

    if (current && idOf(current) === productId) {
      removeItem(productId);
      toastSuccess(`Quitado del kit · ${product.name}`);
    } else {
      // Si había un pick anterior en este slot, lo sacamos del carrito antes
      if (current) removeItem(idOf(current));
      addItem(product, 1);
      toastSuccess(`Agregado al kit · ${product.name}`);
    }
  };

  // Lista de todos los picks (para el panel resumen)
  const allPicks = useMemo(() => Object.values(picks), [picks]);
  const total = allPicks.reduce((s, p) => s + p.price, 0);
  const remaining = budget - total;
  const overBudget = remaining < 0;
  const progress = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  // Quitar un pick desde el panel (chip ✕)
  const removePick = (cat, subKey) => {
    const key = pickKey(cat, subKey);
    const product = picks[key];
    if (!product) return;
    setPicks((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    removeItem(idOf(product));
    toastSuccess(`Quitado del kit · ${product.name}`);
  };

  return (
    <section className="relative bg-gradient-to-br from-cream-50 via-white to-rose-50/40 py-16 sm:py-20 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute top-12 -right-20 w-72 h-72 rounded-full bg-rose-300/15 blur-3xl animate-orb-pulse" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-gold/15 blur-3xl animate-orb-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {!isOpen ? (
          // ─── Compact CTA — toma poco espacio, solo se expande al click ───
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl border border-cream-200 p-5 sm:p-7 shadow-card flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="text-5xl sm:text-6xl flex-shrink-0">🎁</div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <p className="section-label !mb-1">Kit Builder</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 leading-tight">
                Armá tu kit{' '}
                <span className="italic" style={{
                  background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  perfecto
                </span>
              </h2>
              <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                Decinos tu presupuesto y armá un set de esenciales con una barra que se llena
                en tiempo real 💕
              </p>
              {Object.keys(picks).length > 0 && (
                <p className="text-xs font-bold text-rose-600 mt-2">
                  Ya tenés {Object.keys(picks).length} producto{Object.keys(picks).length === 1 ? '' : 's'} en tu kit · {formatCRC(allPicksTotal(picks))}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-full text-sm font-bold text-white shadow-btn hover:shadow-btn-hover transition-all flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {Object.keys(picks).length > 0 ? 'Continuar mi kit' : 'Empezar'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}>
        {/* Header con boton cerrar */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <span className="section-label">🎁 Kit Builder</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-900 leading-tight">
              Armá tu kit{' '}
              <span className="italic" style={{
                background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                perfecto
              </span>
            </h2>
            <p className="text-ink-500 mt-2 text-sm sm:text-base">
              Tocá un producto y se suma al kit (y al carrito). Cambiá de categoría sin
              perder lo que ya elegiste 💕
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-cream-200 hover:border-rose-300 text-ink-500 hover:text-rose-600 flex items-center justify-center transition-colors shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Layout: subtypes (izquierda) + summary panel sticky (derecha en desktop) */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 lg:items-start">

          {/* ─── Columna izquierda: controles + grid ─── */}
          <div className="space-y-4 lg:pb-32">
            {/* Controls */}
            <div className="bg-white rounded-3xl border border-cream-200 p-5 shadow-card">
              <div className="mb-4">
                <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2 block">
                  Tu presupuesto
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                    <span className="text-2xl font-display font-bold text-ink-900">₡</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="flex-1 text-2xl font-display font-bold text-ink-900 bg-transparent border-b-2 border-cream-200 focus:border-rose-400 focus:outline-none py-1 transition-colors"
                      step="500" min="0"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_BUDGETS.map((b) => (
                      <button key={b} onClick={() => setBudget(b)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          budget === b ? 'bg-rose-500 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                        }`}>
                        ₡{(b / 1000).toLocaleString('es-CR')}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2 block">
                  Categoría
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button key={c.key} onClick={() => setCategory(c.key)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${
                        category === c.key ? 'bg-ink-900 text-white shadow-md' : 'bg-cream-100 text-ink-700 hover:bg-cream-200'
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
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-cream-100 p-4 animate-pulse">
                    <div className="h-4 w-32 bg-cream-100 rounded mb-3" />
                    <div className="grid grid-cols-3 gap-3">
                      {[...Array(3)].map((__, j) => <div key={j} className="aspect-[3/4] bg-cream-100 rounded-xl" />)}
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
              <div className="space-y-3">
                {data?.subtypes?.map((sub) => {
                  const hasOptions = sub.options.length > 0;
                  const selectedInThisSlot = picks[pickKey(category, sub.key)];
                  return (
                    <div key={sub.key} className="bg-white rounded-2xl border border-cream-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{sub.emoji}</span>
                          <h3 className="font-display text-base font-bold text-ink-900">{sub.label}</h3>
                          {selectedInThisSlot && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              ✓ en tu kit
                            </span>
                          )}
                        </div>
                        {!hasOptions && <span className="text-xs text-ink-400">Sin opciones en este rango</span>}
                      </div>

                      {hasOptions && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {sub.options.map((p) => {
                            const id = idOf(p);
                            const isSelected = selectedInThisSlot && idOf(selectedInThisSlot) === id;
                            const img = p.images?.[0] || '';
                            return (
                              <motion.button
                                key={id}
                                onClick={() => togglePick(category, sub.key, sub.label, p)}
                                whileTap={{ scale: 0.96 }}
                                className={`relative text-left rounded-xl overflow-hidden border-2 transition-all ${
                                  isSelected
                                    ? 'border-rose-500 shadow-card-hover ring-2 ring-rose-200'
                                    : 'border-cream-200 hover:border-rose-300 hover:shadow-card'
                                }`}>
                                <div className="aspect-[4/3] bg-cream-50 overflow-hidden relative">
                                  {img
                                    ? <img src={optimizedImage(img, 300)} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                    : <div className="w-full h-full bg-cream-200" />}
                                  <AnimatePresence>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="absolute inset-0 bg-rose-500/15 flex items-center justify-center pointer-events-none">
                                        <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"/>
                                          </svg>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                                <div className="p-2">
                                  <p className="text-[10px] text-ink-400 uppercase tracking-wider truncate">{p.brand}</p>
                                  <p className="text-xs font-semibold text-ink-900 line-clamp-2 leading-tight mt-0.5 min-h-[2.4em]">{p.name}</p>
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
          </div>

          {/* ─── Columna derecha: panel resumen (sticky en desktop, bottom sheet en mobile) ─── */}
          <KitSummaryPanel
            picks={allPicks}
            total={total}
            budget={budget}
            remaining={remaining}
            overBudget={overBudget}
            progress={progress}
            onRemove={removePick}
            onOpenCart={openCart}
          />
        </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* Helper: total de los picks (usado por el CTA compacto) */
function allPicksTotal(picks) {
  return Object.values(picks).reduce((s, p) => s + (p?.price || 0), 0);
}

/* Panel resumen — desktop: sticky a la derecha. Mobile: fixed bottom sheet. */
function KitSummaryPanel({ picks, total, budget, remaining, overBudget, progress, onRemove, onOpenCart }) {
  const count = picks.length;

  return (
    <>
      {/* Desktop sticky */}
      <aside className="hidden lg:block lg:sticky lg:top-24">
        <div className="bg-white rounded-3xl border border-cream-200 shadow-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-cream-100">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-1">Tu kit</p>
            <p className="font-display text-2xl font-bold text-ink-900 leading-tight">
              {formatCRC(total)}
              <span className="text-sm text-ink-400 font-normal"> de {formatCRC(budget)}</span>
            </p>
            <p className={`text-xs font-bold mt-1 ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
              {overBudget
                ? `Te pasaste por ${formatCRC(-remaining)}`
                : remaining > 0
                  ? `Te quedan ${formatCRC(remaining)}`
                  : '¡Justo!'}
            </p>
            <ProgressBar progress={progress} overBudget={overBudget} />
          </div>

          <div className="px-5 py-3 max-h-[40vh] overflow-y-auto">
            {count === 0 ? (
              <p className="text-sm text-ink-400 text-center py-6">
                Todavía no elegiste nada.<br/>
                <span className="text-xs">Tocá un producto para agregarlo 👈</span>
              </p>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {picks.map((p) => (
                    <motion.li
                      key={`${p._cat}:${p._subKey}`}
                      layout
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center gap-2 bg-cream-50 rounded-xl p-2">
                      <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex-shrink-0">
                        {p.images?.[0]
                          ? <img src={optimizedImage(p.images[0], 80)} alt="" className="w-full h-full object-cover" loading="lazy" />
                          : <div className="w-full h-full bg-cream-200" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-ink-400 uppercase tracking-wider truncate">{p._subLabel}</p>
                        <p className="text-xs font-semibold text-ink-900 truncate leading-tight">{p.name}</p>
                        <p className="text-xs font-bold text-rose-600">{formatCRC(p.price)}</p>
                      </div>
                      <button
                        onClick={() => onRemove(p._cat, p._subKey)}
                        aria-label="Quitar"
                        className="w-7 h-7 rounded-full bg-white hover:bg-rose-500 hover:text-white text-ink-400 flex items-center justify-center transition-colors flex-shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={onOpenCart}
              disabled={count === 0}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-btn hover:shadow-btn-hover"
              style={{ background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)' }}>
              Ver carrito · {count} producto{count === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom sheet — siempre visible cuando hay picks */}
      <motion.div
        initial={false}
        animate={count > 0 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0, pointerEvents: 'none' }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="bg-white rounded-2xl border border-cream-200 shadow-modal p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 leading-none">Tu kit</p>
              <p className="font-display text-lg font-bold text-ink-900 leading-tight mt-0.5">
                {formatCRC(total)}
                <span className="text-xs text-ink-400 font-normal"> / {formatCRC(budget)}</span>
              </p>
            </div>
            <button
              onClick={onOpenCart}
              className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)' }}>
              Ver · {count}
            </button>
          </div>
          <ProgressBar progress={progress} overBudget={overBudget} compact />
          <p className={`text-[10px] font-semibold mt-1 ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
            {overBudget
              ? `Te pasaste por ${formatCRC(-remaining)}`
              : remaining > 0
                ? `Te quedan ${formatCRC(remaining)}`
                : '¡Justo!'}
          </p>
        </div>
      </motion.div>
    </>
  );
}

function ProgressBar({ progress, overBudget, compact }) {
  return (
    <div className={`bg-cream-100 rounded-full overflow-hidden mt-2 ${compact ? 'h-1.5' : 'h-2.5'}`}>
      <motion.div
        initial={false}
        animate={{ width: `${Math.min(progress, 100)}%` }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        className={`h-full rounded-full ${overBudget ? 'bg-red-500' : ''}`}
        style={overBudget ? undefined : { background: 'linear-gradient(90deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)' }}
      />
    </div>
  );
}
