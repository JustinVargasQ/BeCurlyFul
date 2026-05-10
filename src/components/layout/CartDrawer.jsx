import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import { formatCRC } from '../../lib/currency';
import { optimizedImage } from '../../lib/api';

/* ── Icons ── */
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);
const TagIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

/* ── Coupon strip ── */
function CouponStrip({ couponCode, couponDiscount, couponDesc, setCoupon, clearCoupon, subtotal }) {
  const [input,   setInput]   = useState('');
  const [open,    setOpen]    = useState(!!couponCode);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const apply = async () => {
    const code = input.trim().toUpperCase();
    if (!code || !import.meta.env.VITE_API_URL) {
      setError(!code ? '' : 'Los cupones requieren conexión al servidor.');
      return;
    }
    setLoading(true); setError('');
    try {
      const { default: api } = await import('../../lib/api');
      const { data } = await api.post('/coupons/validate', { code, subtotal });
      setCoupon(data.code, data.discount, data.description, data.type);
      setInput('');
    } catch (err) {
      setError(err.response?.data?.error || 'Cupón inválido o expirado');
    } finally { setLoading(false); }
  };

  const remove = () => { setInput(''); setError(''); clearCoupon(); };

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-rose-500 transition-colors w-full py-0.5">
          <TagIcon />
          ¿Tenés un cupón?
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto opacity-50">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      ) : (
        <AnimatePresence mode="wait">
          {couponCode ? (
            <motion.div key="saved"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-700 truncate">
                    Cupón <span className="font-mono">{couponCode}</span> aplicado
                  </p>
                  {couponDesc && <p className="text-[10px] text-emerald-600 truncate">{couponDesc}</p>}
                </div>
              </div>
              <button onClick={remove} className="text-emerald-300 hover:text-red-400 transition-colors ml-2 flex-shrink-0 p-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => { setInput(e.target.value.toUpperCase()); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && apply()}
                  placeholder="Código de descuento"
                  maxLength={20}
                  disabled={loading}
                  className={`flex-1 font-mono text-sm font-semibold tracking-wider bg-cream-50 border rounded-xl px-3 py-2.5 uppercase placeholder-ink-300 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                    error ? 'border-red-200 focus:ring-red-100' : 'border-cream-200 focus:border-rose-300 focus:ring-rose-100'
                  }`}
                />
                <motion.button whileTap={{ scale: 0.95 }} onClick={apply}
                  disabled={!input.trim() || loading}
                  className="px-4 py-2.5 bg-ink-900 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 whitespace-nowrap">
                  {loading
                    ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    : 'Validar'}
                </motion.button>
              </div>
              {error && (
                <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/* ── Main ── */
export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total,
          couponCode, couponDiscount, couponDesc, couponType,
          setCoupon, clearCoupon } = useCart();
  const location = useLocation();

  const finalTotal = Math.max(0, total - (couponDiscount || 0));

  // Cerrar el cart drawer automaticamente al cambio de ruta. Sin esto, al
  // ir a /checkout el overlay (z-70 bg-black/40) queda oscureciendo la pagina.
  useEffect(() => {
    if (isOpen) closeCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
            onClick={closeCart} />

          {/* Drawer */}
          <motion.div key="drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] z-[70] flex flex-col bg-white shadow-2xl">

            {/* ── Header ── */}
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h2 className="font-display text-2xl font-bold text-ink-900 leading-none">Tu pedido</h2>
                    {/* WA pill */}
                    <span className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full leading-none">
                      <WaIcon />
                    </span>
                  </div>
                  <p className="text-[13px] text-ink-400">
                    {items.length === 0
                      ? 'Agregá productos para continuar'
                      : `${items.length} ${items.length === 1 ? 'producto' : 'productos'}`}
                  </p>
                </div>
                <button onClick={closeCart}
                  className="p-2 rounded-full hover:bg-cream-100 text-ink-400 hover:text-ink-700 transition-colors -mt-1 -mr-1">
                  <CloseIcon />
                </button>
              </div>

              {/* ── Flujo compacto — 1 sola línea ── */}
              {items.length > 0 && (
                <div className="mt-4 flex items-center gap-0 bg-green-50 rounded-2xl px-4 py-3 border border-green-100">
                  {[
                    { n: '1', label: 'Formulario' },
                    { n: '2', label: 'WhatsApp' },
                    { n: '3', label: 'SINPE' },
                  ].map((s, i) => (
                    <div key={s.n} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <span className="w-6 h-6 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                          {s.n}
                        </span>
                        <span className="text-[10px] font-semibold text-green-700 text-center leading-tight">{s.label}</span>
                      </div>
                      {i < 2 && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-300 flex-shrink-0 mb-3">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Divider ── */}
            <div className="h-px bg-cream-100 mx-6" />

            {/* ── Items ── */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-12">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-20 h-20 rounded-3xl bg-green-50 border border-green-100 flex items-center justify-center text-3xl shadow-sm">
                    🛍️
                  </motion.div>
                  <div>
                    <p className="font-semibold text-ink-800 text-base mb-1">Tu pedido está vacío</p>
                    <p className="text-ink-400 text-sm leading-relaxed max-w-[200px]">
                      Elegí productos y te los enviamos por WhatsApp
                    </p>
                  </div>
                  <button onClick={closeCart}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-7 py-2.5 rounded-full transition-colors text-sm shadow-btn">
                    Ver productos
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const img = item.img || item.images?.[0] || '';
                    return (
                      <motion.div key={item.id || item._id}
                        layout
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="flex gap-3.5 p-3.5 rounded-2xl bg-cream-50/80 hover:bg-cream-100/60 transition-colors border border-cream-100">

                        {/* Image */}
                        <div className="w-[68px] h-[68px] rounded-xl overflow-hidden bg-white flex-shrink-0 border border-cream-100 shadow-sm">
                          {img
                            ? <img src={optimizedImage(img, 200)} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            : <div className="w-full h-full bg-cream-200" />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <p className="text-sm font-semibold text-ink-900 leading-snug line-clamp-2 mb-0.5">{item.name}</p>
                            <p className="text-[11px] text-ink-400">{item.brand || 'JD Virtual'}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {/* Qty */}
                            <div className="flex items-center bg-white border border-cream-200 rounded-xl overflow-hidden shadow-sm">
                              <button onClick={() => updateQty(item.id || item._id, item.qty - 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 text-ink-600 transition-colors text-lg font-light leading-none">−</button>
                              <span className="w-7 text-center text-sm font-bold text-ink-900">{item.qty}</span>
                              <button onClick={() => updateQty(item.id || item._id, item.qty + 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 text-ink-600 transition-colors text-lg font-light leading-none">+</button>
                            </div>
                            <p className="font-bold text-ink-900 text-sm">{formatCRC(item.price * item.qty)}</p>
                          </div>
                        </div>

                        {/* Delete */}
                        <button onClick={() => removeItem(item.id || item._id)}
                          className="text-ink-200 hover:text-rose-400 transition-colors self-start mt-0.5 p-1 flex-shrink-0 rounded-lg hover:bg-rose-50">
                          <TrashIcon />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* ── Footer ── */}
            {items.length > 0 && (
              <div className="px-6 pt-4 pb-6 border-t border-cream-100 space-y-4">

                {/* Cupón */}
                <CouponStrip
                  couponCode={couponCode}
                  couponDiscount={couponDiscount}
                  couponDesc={couponDesc}
                  setCoupon={setCoupon}
                  clearCoupon={clearCoupon}
                  subtotal={total}
                />

                {/* Totales */}
                <div className="space-y-2">
                  {couponDiscount > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm text-ink-500">
                        <span>Subtotal</span>
                        <span>{formatCRC(total)}</span>
                      </div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center justify-between text-sm">
                        <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                          <TagIcon />
                          Cupón <span className="font-mono font-bold">{couponCode}</span>
                        </span>
                        <span className="text-emerald-600 font-semibold">−{formatCRC(couponDiscount)}</span>
                      </motion.div>
                      <div className="h-px bg-cream-200" />
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-ink-900">Total estimado</span>
                    <span className="text-xl font-bold text-ink-900">{formatCRC(finalTotal)}</span>
                  </div>
                  <p className="text-[11px] text-ink-400">+ envío según tu ubicación</p>
                </div>

                {/* CTA */}
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/checkout" onClick={closeCart}
                    className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#1fbc59] text-white font-bold py-4 rounded-2xl transition-colors shadow-lg text-[15px]">
                    <WaIcon />
                    Pedir por WhatsApp
                  </Link>
                </motion.div>

                {/* Steps mini text */}
                <p className="text-center text-[11px] text-ink-400 leading-relaxed">
                  Completás un formulario rápido → te confirmamos por WhatsApp → pagás por SINPE
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
