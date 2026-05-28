import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api, { optimizedImage, normalizeVariants } from '../../lib/api';
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
  const [category, setCategory]   = useState('rizos');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  /* picks: { 'maquillaje:base': [product1, product2], 'skincare:hidratante': [product3] }
   * Cada slot es un ARRAY de productos, asi una clienta puede llevarse 2 bases,
   * 3 labiales, etc. Persistido en localStorage para sobrevivir navegacion. */
  const [picks, setPicks] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('bcf-kit-picks');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      // Validar shape minimo
      if (!parsed || typeof parsed !== 'object') return {};
      // Normalizar: si algun valor es objeto (single product) lo envolvemos
      // en array (formato viejo → nuevo)
      const out = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v)) out[k] = v;
        else if (v && typeof v === 'object') out[k] = [v];
      }
      return out;
    } catch {
      return {};
    }
  });

  // Guardar picks en localStorage cada vez que cambian.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (Object.keys(picks).length === 0) {
        localStorage.removeItem('bcf-kit-picks');
      } else {
        localStorage.setItem('bcf-kit-picks', JSON.stringify(picks));
      }
    } catch {}
  }, [picks]);
  /* Preview modal: { product, subKey, subLabel } o null. Al click en un card
   * NO se auto-agrega — se abre este modal con foto grande + descripcion +
   * boton para confirmar. */
  const [preview, setPreview] = useState(null);
  /* Subtipos que mostraron 'Ver mas' (expandidos a todas las opciones) */
  const [expanded, setExpanded] = useState({});
  const { addItem, removeItem, openCart, items: cartItems } = useCart();
  const toastSuccess = useToastStore((s) => s.success);

  // Cargar opciones cuando cambia la categoría o el presupuesto. Solo cuando
  // el widget está abierto — no gastar bandwidth si el usuario nunca lo abre.
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(`/products/kit-options?cat=${category}&budget=${budget}&limit=10`)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.error || 'No se pudieron cargar opciones'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, budget, isOpen]);

  /* Click toggle: si el producto ya está pickeado lo saca; si no, lo agrega
   * al array del slot. Permite multiples productos por slot (ej. 2 bases).
   * selectedVariants es opcional: { Tono: 'Rojo', Color: 'Medio' }. */
  const togglePick = (cat, subKey, subLabel, product, selectedVariants) => {
    const key = pickKey(cat, subKey);
    const productId = idOf(product);
    const current = picks[key] || [];
    const isAlready = current.some((p) => idOf(p) === productId);

    setPicks((prev) => {
      const next = { ...prev };
      const list = next[key] || [];
      if (isAlready) {
        const filtered = list.filter((p) => idOf(p) !== productId);
        if (filtered.length === 0) delete next[key];
        else next[key] = filtered;
      } else {
        next[key] = [...list, {
          ...product,
          _cat: cat,
          _subKey: subKey,
          _subLabel: subLabel,
          ...(selectedVariants && Object.keys(selectedVariants).length > 0
            ? { selectedVariants }
            : {}),
        }];
      }
      return next;
    });

    if (isAlready) {
      removeItem(productId);
      toastSuccess(`Quitado del kit · ${product.name}`);
    } else {
      // Pasar las variantes al cart adjuntando al objeto producto
      const productWithVariants = selectedVariants && Object.keys(selectedVariants).length > 0
        ? { ...product, selectedVariants }
        : product;
      addItem(productWithVariants, 1);
      const variantSummary = selectedVariants && Object.keys(selectedVariants).length > 0
        ? ` (${Object.values(selectedVariants).join(', ')})`
        : '';
      toastSuccess(`Agregado al kit · ${product.name}${variantSummary}`);
    }
  };

  // Lista plana de todos los picks (para el panel resumen)
  const allPicks = useMemo(() => {
    const out = [];
    for (const list of Object.values(picks)) {
      if (Array.isArray(list)) out.push(...list);
      else if (list) out.push(list); // backward compat con estado viejo (single product)
    }
    return out;
  }, [picks]);
  const total = allPicks.reduce((s, p) => s + p.price, 0);
  const remaining = budget - total;
  const overBudget = remaining < 0;
  const progress = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  // Quitar un producto especifico desde el panel (chip ✕)
  const removePick = (cat, subKey, productId) => {
    const key = pickKey(cat, subKey);
    const list = picks[key] || [];
    const product = list.find((p) => idOf(p) === productId);
    if (!product) return;
    setPicks((prev) => {
      const next = { ...prev };
      const filtered = (next[key] || []).filter((p) => idOf(p) !== productId);
      if (filtered.length === 0) delete next[key];
      else next[key] = filtered;
      return next;
    });
    removeItem(productId);
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
            className="relative bg-white rounded-3xl border border-cream-200 p-5 sm:p-7 shadow-card flex flex-col sm:flex-row items-center gap-4 sm:gap-6 overflow-hidden group hover:shadow-card-hover hover:border-rose-200 transition-all">
            {/* Orb decorativo detrás del emoji */}
            <div aria-hidden className="absolute -left-8 -top-8 w-40 h-40 rounded-full bg-rose-200/30 blur-2xl group-hover:bg-rose-300/40 transition-colors" />
            <div className="relative text-5xl sm:text-6xl flex-shrink-0 select-none">
              <motion.span
                animate={{ rotate: [0, -8, 8, -4, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                className="inline-block">
                🎁
              </motion.span>
            </div>
            <div className="relative flex-1 text-center sm:text-left min-w-0">
              <p className="section-label !mb-1">Kit Builder</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 leading-tight">
                Armá tu kit{' '}
                <span className="italic" style={{
                  background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  perfecto
                </span>
              </h2>
              <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                Decinos tu presupuesto y armá un set de esenciales con una barra que se llena
                en tiempo real 💕
              </p>
              {allPicks.length > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold mt-2 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {allPicks.length} en tu kit · {formatCRC(total)}
                </motion.p>
              )}
            </div>
            <motion.button
              onClick={() => setIsOpen(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="relative flex items-center gap-2 px-5 sm:px-6 py-3 rounded-full text-sm font-bold text-white shadow-btn hover:shadow-btn-hover transition-shadow flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {allPicks.length > 0 ? 'Continuar mi kit' : 'Empezar'}
            </motion.button>
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
                background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)',
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
                  const slotPicks = picks[pickKey(category, sub.key)] || [];
                  const selectedInThisSlot = slotPicks.length > 0;
                  return (
                    <div key={sub.key} className={`relative bg-white rounded-2xl border p-4 shadow-sm transition-colors ${
                      selectedInThisSlot ? 'border-rose-200' : 'border-cream-100'
                    }`}>
                      {/* Accent lateral — cambia a rose cuando hay pick en este slot */}
                      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-colors ${
                        selectedInThisSlot ? 'bg-rose-500' : 'bg-cream-200'
                      }`} />
                      <div className="flex items-center justify-between mb-3 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-cream-50 border border-cream-200 flex items-center justify-center text-base shadow-sm">
                            <span>{sub.emoji}</span>
                          </div>
                          <h3 className="font-display text-base font-bold text-ink-900">{sub.label}</h3>
                          {selectedInThisSlot && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              {slotPicks.length > 1 ? `${slotPicks.length} en tu kit` : 'en tu kit'}
                            </motion.span>
                          )}
                        </div>
                        {!hasOptions && <span className="text-xs text-ink-400">Sin opciones</span>}
                      </div>

                      {hasOptions && (() => {
                        const INITIAL = 6;
                        const isExpanded = !!expanded[sub.key];
                        const visibleOptions = isExpanded ? sub.options : sub.options.slice(0, INITIAL);
                        const moreCount = sub.options.length - INITIAL;
                        return (
                        <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {visibleOptions.map((p) => {
                            const id = idOf(p);
                            const isSelected = slotPicks.some((x) => idOf(x) === id);
                            const img = p.images?.[0] || '';
                            return (
                              <motion.button
                                key={id}
                                onClick={() => setPreview({ product: p, subKey: sub.key, subLabel: sub.label })}
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
                        {moreCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpanded((prev) => ({ ...prev, [sub.key]: !prev[sub.key] }))}
                            className="mt-2.5 ml-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors">
                            {isExpanded ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="18 15 12 9 6 15"/>
                                </svg>
                                Ver menos
                              </>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                                Ver {moreCount} {moreCount === 1 ? 'opción más' : 'opciones más'}
                              </>
                            )}
                          </button>
                        )}
                        </>
                        );
                      })()}
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

      {/* Preview modal — se abre al click en un card del grid */}
      <AnimatePresence>
        {preview && (
          <KitProductModal
            product={preview.product}
            subKey={preview.subKey}
            subLabel={preview.subLabel}
            isSelected={(() => {
              const list = picks[pickKey(category, preview.subKey)] || [];
              return list.some((p) => idOf(p) === idOf(preview.product));
            })()}
            onClose={() => setPreview(null)}
            onConfirm={(selectedVariants) => {
              togglePick(category, preview.subKey, preview.subLabel, preview.product, selectedVariants);
              setPreview(null);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

/* Helper: total de los picks (usado por el CTA compacto) */
function allPicksTotal(picks) {
  return Object.values(picks).reduce((s, p) => s + (p?.price || 0), 0);
}

/* Modal de preview — foto grande + descripcion + features + CTA agregar/quitar.
 * Si el producto tiene variants (Tono, Color, etc.), pide selegir antes. */
function KitProductModal({ product, subKey, subLabel, isSelected, onClose, onConfirm }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState({});
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const outOfStock = product.stock === 0;
  const discount = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;

  const variants = normalizeVariants(product.variants);

  // Si alguna opcion de variante elegida tiene imagen propia, esa pisa la
  // imagen principal. Asi, elegir 'Rosado' muestra la foto rosada.
  const variantImage = (() => {
    for (const v of variants) {
      const chosen = selectedVariants[v.name];
      if (!chosen) continue;
      const opt = v.options.find((o) => o.value === chosen);
      if (opt?.image) return opt.image;
    }
    return null;
  })();
  const currentImg = variantImage || images[imgIdx] || images[0] || '';
  // Requerir seleccion para cada variante antes de poder agregar
  const missingVariant = variants.find((v) => !selectedVariants[v.name]);
  const canConfirm = !outOfStock && (isSelected || !missingVariant);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(selectedVariants);
  };

  // Cierre con Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Lock scroll del body mientras el modal esta abierto
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-3xl max-h-[92dvh] overflow-hidden shadow-modal flex flex-col sm:grid sm:grid-cols-2">

        {/* Imagen — top en mobile, izquierda en desktop.
            Mobile: altura limitada (38dvh) para que el contenido y el CTA
            queden visibles sin scroll forzado, y object-contain para que las
            fotos verticales (botellas, perfumes) no queden cortadas. */}
        <div className="relative bg-cream-50 h-[38dvh] sm:h-full sm:aspect-auto flex-shrink-0">
          {currentImg ? (
            <img src={optimizedImage(currentImg, 800)} alt={product.name}
              className="w-full h-full object-contain sm:object-cover" decoding="async" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-200">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {outOfStock ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ink-500 text-white">Agotado</span>
            ) : discount > 0 && (
              <span className="text-[10px] font-bold text-white px-2.5 py-1 rounded-full shadow-sm"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)' }}>
                -{discount}%
              </span>
            )}
          </div>

          {/* Cerrar — visible sobre la imagen */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-ink-700 hover:text-ink-900 flex items-center justify-center shadow-md transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Thumbnails si hay multiples imagenes */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.slice(0, 6).map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  aria-label={`Imagen ${i + 1}`}
                  className={`rounded-full transition-all ${i === imgIdx ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/60'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-2 overflow-y-auto flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">{subLabel}</p>
            <p className="text-xs text-ink-400 uppercase tracking-wider">{product.brand}</p>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-ink-900 leading-tight mt-0.5">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2 mt-3">
              <span className="font-display text-2xl font-bold text-ink-900">{formatCRC(product.price)}</span>
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="text-sm text-ink-300 line-through">{formatCRC(product.oldPrice)}</span>
              )}
            </div>

            {/* Variantes (Tono, Color, etc.) — requeridas antes de agregar.
             * Si la opcion tiene imagen propia, el chip incluye thumbnail. */}
            {variants.length > 0 && !isSelected && (
              <div className="mt-4 space-y-3 border border-rose-100 bg-rose-50/40 rounded-xl p-3">
                {variants.map((v) => (
                  <div key={v.name}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1.5">
                      {v.name}: <span className="text-rose-600 normal-case font-bold">{selectedVariants[v.name] || 'Elegí uno'}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {v.options.map((opt) => {
                        const isOn = selectedVariants[v.name] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setSelectedVariants((s) => ({ ...s, [v.name]: opt.value }))}
                            className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                              isOn
                                ? 'border-rose-500 bg-rose-500 text-white'
                                : 'border-cream-200 bg-white text-ink-700 hover:border-rose-300'
                            }`}>
                            {opt.image ? (
                              <img src={optimizedImage(opt.image, 40)} alt={opt.value}
                                className={`w-5 h-5 rounded-full object-cover ring-1 ${isOn ? 'ring-white/50' : 'ring-cream-200'}`}
                                loading="lazy" decoding="async" />
                            ) : (
                              <span className="w-5 h-5" />
                            )}
                            {opt.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {product.description && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-1">Descripción</p>
                <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {Array.isArray(product.features) && product.features.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-1.5">Beneficios</p>
                <ul className="space-y-1.5">
                  {product.features.slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 flex-shrink-0 mt-0.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.reviewCount > 0 && product.rating > 0 && (
              <div className="mt-4 flex items-center gap-1.5 text-sm">
                <span className="text-amber-500">★</span>
                <span className="font-semibold text-ink-700">{Number(product.rating).toFixed(1)}</span>
                <span className="text-ink-400">({product.reviewCount} reseña{product.reviewCount === 1 ? '' : 's'})</span>
              </div>
            )}

            <Link
              to={`/producto/${product.slug}`}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-2 mt-4">
              Ver producto completo
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>

          {/* Footer con CTA */}
          <div className="border-t border-cream-100 p-4 bg-white">
            {missingVariant && !isSelected && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2 flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Elegí un {missingVariant.name.toLowerCase()} antes de agregar
              </p>
            )}
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all shadow-btn hover:shadow-btn-hover disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected ? 'bg-ink-900 text-white hover:bg-ink-700' : 'text-white'
              }`}
              style={!isSelected && canConfirm
                ? { background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)' }
                : undefined}>
              {outOfStock ? (
                'Agotado'
              ) : isSelected ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                  Quitar del kit
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Agregar al kit · {formatCRC(product.price)}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Panel resumen — desktop: sticky a la derecha. Mobile: fixed bottom sheet. */
function KitSummaryPanel({ picks, total, budget, remaining, overBudget, progress, onRemove, onOpenCart }) {
  const count = picks.length;

  return (
    <>
      {/* Desktop sticky */}
      <aside className="hidden lg:block lg:sticky lg:top-24">
        <div className="bg-white rounded-3xl border border-cream-200 shadow-card overflow-hidden">
          {/* Header con gradiente sutil */}
          <div className="relative px-5 pt-5 pb-4 border-b border-cream-100 overflow-hidden">
            <div aria-hidden className="absolute -top-12 -right-8 w-32 h-32 rounded-full bg-rose-100/40 blur-2xl pointer-events-none" />
            <div aria-hidden className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1 flex items-center gap-1.5">
                <span>🎁</span> Tu kit
              </p>
              <p className="font-display text-2xl font-bold text-ink-900 leading-tight">
                {formatCRC(total)}
                <span className="text-sm text-ink-400 font-normal"> de {formatCRC(budget)}</span>
              </p>
              <p className={`text-xs font-bold mt-1 ${overBudget ? 'text-red-600' : count > 0 ? 'text-emerald-600' : 'text-ink-400'}`}>
                {overBudget
                  ? `⚠ Te pasaste por ${formatCRC(-remaining)}`
                  : count === 0
                    ? 'Tocá un producto para empezar'
                    : remaining > 0
                      ? `Te quedan ${formatCRC(remaining)}`
                      : '¡Justo!'}
              </p>
              <ProgressBar progress={progress} overBudget={overBudget} active={count > 0} />
            </div>
          </div>

          <div className="px-5 py-3 max-h-[40vh] overflow-y-auto">
            {count === 0 ? (
              <div className="text-center py-7">
                <div className="text-3xl mb-2 opacity-60">🛍️</div>
                <p className="text-sm font-semibold text-ink-700 mb-1">Tu kit está vacío</p>
                <p className="text-xs text-ink-400 leading-relaxed max-w-[200px] mx-auto">
                  Tocá cualquier producto a la izquierda para verlo en detalle y agregarlo
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {picks.map((p) => (
                    <motion.li
                      key={`${p._cat}:${p._subKey}:${idOf(p)}`}
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
                        {p.selectedVariants && Object.keys(p.selectedVariants).length > 0 && (
                          <p className="text-[10px] text-rose-600 font-semibold truncate">
                            {Object.entries(p.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </p>
                        )}
                        <p className="text-xs font-bold text-rose-600">{formatCRC(p.price)}</p>
                      </div>
                      <button
                        onClick={() => onRemove(p._cat, p._subKey, idOf(p))}
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
              style={{ background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)' }}>
              Ver carrito · {count} producto{count === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom sheet — siempre visible cuando hay picks.
          right-20 (en vez de right-3) deja un hueco a la derecha para que el
          boton flotante de la asesora IA (fixed right-5, bottom-6, ~56px de
          ancho) no quede encima del CTA "Ver". */}
      <motion.div
        initial={false}
        animate={count > 0 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0, pointerEvents: 'none' }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        className="lg:hidden fixed bottom-3 left-3 right-20 z-40">
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
              style={{ background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)' }}>
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

function ProgressBar({ progress, overBudget, compact, active = true }) {
  return (
    <div className={`relative bg-cream-100 rounded-full overflow-hidden mt-2 ${compact ? 'h-1.5' : 'h-2.5'}`}>
      <motion.div
        initial={false}
        animate={{ width: `${Math.min(progress, 100)}%` }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        className={`relative h-full rounded-full overflow-hidden ${overBudget ? 'bg-red-500' : ''}`}
        style={overBudget ? undefined : { background: 'linear-gradient(90deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)' }}>
        {/* Shimmer animado mientras la barra esta llena y no sobrepaso el budget */}
        {active && !overBudget && progress > 0 && (
          <motion.span
            aria-hidden
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 0.5 }}
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent)' }}
          />
        )}
      </motion.div>
    </div>
  );
}
