import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import useQuickView from '../../store/quickViewStore';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import useFlyStore from '../../store/flyStore';
import { formatCRC } from '../../lib/currency';
import { optimizedImage } from '../../lib/api';

const WaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
);

export default function QuickView() {
  const product = useQuickView((s) => s.product);
  const close   = useQuickView((s) => s.close);
  const { addItem }     = useCart();
  const { has, toggle } = useWishlist();
  const fly             = useFlyStore((s) => s.fly);
  const imgRef          = useRef(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!product) return undefined;
    setAdded(false);
    const onEsc = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = prev; };
  }, [product, close]);

  const img        = product?.images?.[0] || product?.img || '';
  const discount   = product?.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const outOfStock = product?.stock === 0;
  const isFav      = product ? has(product) : false;

  const handleAdd = () => {
    if (outOfStock) return;
    const rect = imgRef.current?.getBoundingClientRect();
    if (rect && img) fly(optimizedImage(img, 200), { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => close(), 550);
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          key="qv"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(35,26,27,0.5)', backdropFilter: 'blur(5px)' }}
          onClick={close}>

          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-md bg-cream-50 rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden flex flex-col"
            style={{ maxHeight: '92dvh' }}>

            {/* Handle + cerrar */}
            <div className="absolute top-3 right-3 z-10">
              <button onClick={close} aria-label="Cerrar"
                className="w-9 h-9 rounded-full bg-white/85 backdrop-blur text-ink-600 hover:text-ink-900 flex items-center justify-center shadow-soft">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="overflow-y-auto">
              {/* Foto */}
              <div ref={imgRef} className="relative w-full bg-white" style={{ aspectRatio: '1' }}>
                {img
                  ? <img src={optimizedImage(img, 700)} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-cream-200" />}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {discount > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">-{discount}%</span>}
                  {product.badge && !discount && <span className="bg-ink-900 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">{product.badge}</span>}
                </div>
              </div>

              {/* Info */}
              <div className="px-5 pt-4 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500/90">{product.brand || 'Be Curlyful'}</span>
                <h2 className="font-display font-semibold text-ink-900 text-xl leading-tight mt-1 mb-2">{product.name}</h2>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-display font-semibold text-ink-900 text-2xl tabular-nums">{formatCRC(product.price)}</span>
                  {product.oldPrice && <span className="text-sm text-ink-400 line-through">{formatCRC(product.oldPrice)}</span>}
                </div>
                {product.description && (
                  <p className="text-ink-500 text-[14px] leading-relaxed line-clamp-3 mb-3">{product.description}</p>
                )}
                {product.features?.length > 0 && (
                  <ul className="space-y-1.5 mb-2">
                    {product.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-ink-700">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 flex-shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Acciones fijas */}
            <div className="px-5 pt-3 pb-5 border-t border-cream-200 bg-cream-50"
              style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-2.5">
                <button onClick={handleAdd} disabled={outOfStock}
                  className={`flex-1 py-3.5 rounded-full font-semibold text-[15px] transition-all shadow-btn disabled:opacity-50 ${
                    outOfStock ? 'bg-cream-200 text-ink-400' : added ? 'bg-green-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                  {outOfStock ? 'Agotado' : added ? '✓ Agregado' : 'Agregar al carrito'}
                </button>
                <button onClick={() => toggle(product)} aria-label="Favoritos"
                  className={`w-12 rounded-full border-2 flex items-center justify-center transition-all ${isFav ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-cream-200 text-ink-400 hover:border-rose-300'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              </div>
              <Link to={`/producto/${product.slug}`} onClick={close}
                className="mt-2.5 flex items-center justify-center gap-1.5 text-sm text-rose-600 font-semibold py-1.5 hover:gap-2.5 transition-all">
                Ver detalle completo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
