import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { formatCRC } from '../../lib/currency';
import { trackViewItem } from '../../lib/analytics';
import { assetUrl } from '../../lib/api';

/* ── icons ── */
const CloseIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const CartIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const WaIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
const HeartIcon  = ({ filled }) => <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const ArrowIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>;
const StarIcon   = ({ filled }) => <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={filled ? 'text-amber-400' : 'text-ink-200'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const ChevLeft   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;

const BADGE_STYLES = {
  new:  'bg-sky-500 text-white',
  sale: 'bg-red-500 text-white',
  hot:  'bg-orange-500 text-white',
  '':   'bg-ink-900 text-white',
};

export default function QuickViewModal({ product, onClose }) {
  const { addItem, openCart } = useCart();
  const { has, toggle }       = useWishlist();
  const isFav = has(product);

  const allImages = product.images?.length > 0
    ? product.images
    : product.img ? [product.img] : [];

  const [imgIdx, setImgIdx]   = useState(0);
  const [added, setAdded]     = useState(false);
  const [imgError, setImgError] = useState(false);

  /* variant selections: { variantName: selectedOption } */
  const [variants, setVariants] = useState(() => {
    const init = {};
    (product.variants || []).forEach((v) => { init[v.name] = v.options[0] || ''; });
    return init;
  });

  const discount   = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const outOfStock = product.stock !== undefined && product.stock !== null && product.stock === 0;
  const currentImg = allImages[imgIdx] || '';

  /* analytics */
  useEffect(() => { trackViewItem(product); }, [product]);

  /* body scroll lock + ESC */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const handleAdd = () => {
    if (outOfStock) return;
    addItem(product, 1);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1800);
  };

  const handleFav = (e) => { e.stopPropagation(); toggle(product); };

  const prevImg = (e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + allImages.length) % allImages.length); };
  const nextImg = (e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % allImages.length); };

  const imgSrc = currentImg ? assetUrl(currentImg) : '';

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="qv-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[200] bg-ink-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:px-4 sm:py-6"
        onClick={onClose}>

        {/* Panel */}
        <motion.div
          key="qv-panel"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.3, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">

          {/* Drag handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-ink-200" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-white shadow-sm transition-all">
            <CloseIcon />
          </button>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:min-h-[460px]">

              {/* ── Left: Image gallery ── */}
              <div className="sm:w-[46%] flex-shrink-0 bg-cream-50 relative flex flex-col">
                {/* Main image */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '1' }}>
                  <AnimatePresence mode="wait">
                    {imgSrc && !imgError ? (
                      <motion.img
                        key={imgIdx}
                        src={imgSrc}
                        alt={product.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-200">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                        </svg>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Nav arrows (only when > 1 image) */}
                  {allImages.length > 1 && (
                    <>
                      <button onClick={prevImg}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center text-ink-700 hover:bg-white shadow transition-all">
                        <ChevLeft />
                      </button>
                      <button onClick={nextImg}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center text-ink-700 hover:bg-white shadow transition-all">
                        <ChevRight />
                      </button>
                    </>
                  )}

                  {/* Discount badge */}
                  {discount > 0 && (
                    <span className="absolute top-3 left-3 text-[11px] font-bold text-white px-2.5 py-1 rounded-full shadow-sm"
                      style={{ background: 'linear-gradient(135deg,#ef4444,#f43f5e)' }}>
                      -{discount}%
                    </span>
                  )}
                  {product.badge && (
                    <span className={`absolute top-3 ${discount > 0 ? 'left-[4.5rem]' : 'left-3'} text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${BADGE_STYLES[product.badgeType] || BADGE_STYLES['']}`}>
                      {product.badge}
                    </span>
                  )}
                </div>

                {/* Thumbnails */}
                {allImages.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto">
                    {allImages.map((url, i) => (
                      <button key={i} onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                        className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                          i === imgIdx ? 'border-rose-500 opacity-100' : 'border-cream-200 opacity-60 hover:opacity-90'
                        }`}>
                        <img src={assetUrl(url)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Right: Info ── */}
              <div className="flex-1 flex flex-col gap-4 p-5 sm:p-7 sm:overflow-y-auto">

                {/* Brand + wishlist row */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
                    {product.brand || 'JD Virtual'}
                  </span>
                  <button
                    onClick={handleFav}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                      isFav ? 'bg-rose-500 text-white' : 'bg-cream-100 text-ink-500 hover:bg-rose-100 hover:text-rose-500'
                    }`}>
                    <HeartIcon filled={isFav} />
                  </button>
                </div>

                {/* Name */}
                <h2 className="font-display text-xl sm:text-2xl font-bold text-ink-900 leading-snug">
                  {product.name}
                </h2>

                {/* Stars */}
                {(product.rating || product.reviews > 0) && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => <StarIcon key={s} filled={s <= Math.round(product.rating || 5)} />)}
                    </div>
                    {product.reviews > 0 && (
                      <span className="text-xs text-ink-400">({product.reviews} reseñas)</span>
                    )}
                  </div>
                )}

                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-bold text-2xl text-ink-900">{formatCRC(product.price)}</span>
                    {product.oldPrice && (
                      <span className="text-sm text-ink-300 line-through">{formatCRC(product.oldPrice)}</span>
                    )}
                  </div>
                  {product.oldPrice && discount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/80 px-2.5 py-0.5 rounded-full mt-1.5">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Ahorrás {formatCRC(product.oldPrice - product.price)}
                    </span>
                  )}
                </div>

                {/* Stock warning */}
                {product.stock > 0 && product.stock <= 5 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                    <span className="text-xs font-semibold text-amber-600">¡Solo quedan {product.stock} unidades!</span>
                  </div>
                )}
                {outOfStock && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-red-500">Agotado temporalmente</span>
                  </div>
                )}

                {/* Variants */}
                {(product.variants || []).filter((v) => v.options?.length > 0).map((v) => (
                  <div key={v.name}>
                    <p className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                      {v.name}: <span className="text-ink-700 normal-case font-semibold">{variants[v.name]}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {v.options.map((opt) => (
                        <button key={opt}
                          onClick={(e) => { e.stopPropagation(); setVariants((prev) => ({ ...prev, [v.name]: opt })); }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                            variants[v.name] === opt
                              ? 'border-rose-500 bg-rose-50 text-rose-600'
                              : 'border-cream-200 text-ink-600 hover:border-rose-300'
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Description teaser */}
                {product.description && (
                  <p className="text-sm text-ink-500 leading-relaxed line-clamp-3">
                    {product.description}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-auto pt-2 space-y-2.5">
                  <button
                    onClick={handleAdd}
                    disabled={outOfStock}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 shadow-btn ${
                      outOfStock
                        ? 'bg-ink-200 text-ink-400 cursor-not-allowed'
                        : added
                          ? 'bg-green-500 text-white scale-[0.98]'
                          : 'bg-rose-500 hover:bg-rose-600 text-white hover:shadow-btn-hover'
                    }`}>
                    <CartIcon />
                    {outOfStock ? 'Agotado' : added ? '¡Agregado al carrito!' : 'Agregar al carrito'}
                  </button>

                  <a
                    href={`https://wa.me/50688045100?text=${encodeURIComponent(`Hola! Me interesa: ${product.name} a ${formatCRC(product.price)}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold bg-[#25D366] hover:bg-[#1db954] text-white transition-colors">
                    <WaIcon /> Consultar por WhatsApp
                  </a>

                  <Link to={`/producto/${product.slug}`} onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold text-ink-500 hover:text-rose-500 border border-cream-200 hover:border-rose-300 transition-colors">
                    Ver todos los detalles <ArrowIcon />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
