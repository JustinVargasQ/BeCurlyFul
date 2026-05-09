import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { formatCRC } from '../../lib/currency';
import { optimizedImage } from '../../lib/api';

const StarIcon = ({ filled }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={filled ? 'text-amber-400' : 'text-ink-200'}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const CartPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);
const HeartIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const WaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const BADGE_STYLES = {
  new:  'bg-sky text-white',
  sale: 'bg-coral text-white',
  '':   'bg-ink-900 text-white',
};

export default function ProductCard({ product, index = 0 }) {
  const { addItem, openCart } = useCart();
  const { has, toggle }       = useWishlist();
  const [added, setAdded]     = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imgIdx, setImgIdx]   = useState(0);
  const [imgError, setImgError] = useState(false);
  const intervalRef           = useRef(null);
  const cardRef               = useRef(null);

  /* ── 3D tilt ── */
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 150, damping: 18 });
  const springY = useSpring(rotateY, { stiffness: 150, damping: 18 });

  const allImages = product.images?.length > 0 ? product.images : (product.img ? [product.img] : []);
  const currentImg = allImages[imgIdx] || '';

  const discount   = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const isFav      = has(product);
  const outOfStock = product.stock !== undefined && product.stock !== null && product.stock === 0;

  /* cleanup interval on unmount */
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleMouseEnter = () => {
    setHovered(true);
    if (allImages.length > 1) {
      intervalRef.current = setInterval(() => setImgIdx((i) => (i + 1) % allImages.length), 900);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setImgIdx(0);
  };

  const handleMouseMove = (e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-y * 7);
    rotateY.set(x * 7);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, 1);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1800);
  };

  const handleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
  };

  return (
    /* perspective wrapper — needed for 3D tilt to look correct */
    <div style={{ perspective: '900px' }}>
      <motion.div
        ref={cardRef}
        style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: [0.3, 1, 0.3, 1], delay: (index % 4) * 0.07 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <Link to={`/producto/${product.slug}`}
          className="group block bg-white rounded-2xl overflow-hidden border border-cream-200 hover:border-rose-200 hover:shadow-card-hover transition-all duration-500">

          {/* ── Image ── */}
          <div className="relative overflow-hidden bg-cream-50" style={{ aspectRatio: '1' }}>
            {currentImg && !imgError ? (
              <>
                <motion.img
                  key={imgIdx}
                  src={optimizedImage(currentImg, 600)}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full object-cover transition-transform duration-700 ease-snappy group-hover:scale-105"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
                {/* Image index dots when multiple images */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {allImages.map((_, i) => (
                      <span key={i}
                        className={`rounded-full bg-white transition-all duration-300 shadow-sm ${
                          i === imgIdx ? 'w-3.5 h-1.5' : 'w-1.5 h-1.5 opacity-60'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-200">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
              </div>
            )}

            {/* Wishlist heart */}
            <motion.button
              onClick={handleFav}
              aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              whileTap={{ scale: 0.82 }}
              animate={isFav ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.38, ease: [0.3, 1, 0.3, 1] }}
              className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-md shadow-md transition-colors duration-200 z-10 ${
                isFav
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-white/80 text-ink-600 hover:text-rose-500 hover:bg-white'
              }`}>
              <HeartIcon filled={isFav} />
            </motion.button>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              {outOfStock ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ink-500 text-white">
                  Agotado
                </span>
              ) : (
                <>
                  {product.badge && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${BADGE_STYLES[product.badgeType] || BADGE_STYLES['']}`}>
                      {product.badge}
                    </span>
                  )}
                  {discount > 0 && (
                    <motion.span
                      className="text-[10px] font-bold text-white px-2.5 py-1 rounded-full shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)' }}
                      animate={{ scale: [1, 1.07, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
                      -{discount}%
                    </motion.span>
                  )}
                </>
              )}
            </div>

            {/* Action buttons — reveal on hover */}
            <motion.div
              initial={false}
              animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 10 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="absolute bottom-0 inset-x-0 p-3 flex gap-2">
              <button onClick={handleAdd} disabled={outOfStock}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg ${
                  outOfStock ? 'bg-ink-200 text-ink-400 cursor-not-allowed' :
                  added ? 'bg-green-500 text-white scale-95' : 'bg-white text-ink-900 hover:bg-ink-900 hover:text-white'
                }`}>
                <CartPlusIcon />
                {outOfStock ? 'Agotado' : added ? '¡Agregado!' : 'Al carrito'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`https://wa.me/50688045100?text=${encodeURIComponent(`Hola! Me interesa: ${product.name} a ${formatCRC(product.price)}`)}`, '_blank', 'noopener');
                }}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg transition-colors">
                <WaIcon />
              </button>
            </motion.div>
          </div>

          {/* ── Info ── */}
          <div className="p-4">
            <p className="text-[11px] text-ink-400 font-semibold uppercase tracking-widest mb-1">{product.brand || 'JD Virtual'}</p>
            <h3 className="text-sm font-semibold text-ink-900 leading-snug mb-2.5 line-clamp-2 group-hover:text-rose-500 transition-colors duration-200">
              {product.name}
            </h3>

            {/* Stars */}
            <div className="flex items-center gap-1 mb-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => <StarIcon key={s} filled={s <= Math.round(product.rating || 5)} />)}
              </div>
              {product.reviews > 0 && (
                <span className="text-[11px] text-ink-400">({product.reviews})</span>
              )}
            </div>

            {/* Urgency / social proof */}
            {product.stock !== undefined && product.stock > 0 && product.stock <= 5 ? (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                <span className="text-[11px] font-semibold text-amber-600">¡Solo quedan {product.stock}!</span>
              </div>
            ) : product.reviews >= 30 ? (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                <span className="text-[11px] font-semibold text-rose-500">Muy buscado</span>
              </div>
            ) : null}

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-ink-900 text-base">{formatCRC(product.price)}</span>
              {product.oldPrice && (
                <span className="text-xs text-ink-300 line-through">{formatCRC(product.oldPrice)}</span>
              )}
            </div>

            {/* Savings chip */}
            {product.oldPrice && discount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.3, 1, 0.3, 1] }}
                className="mt-2"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/80 px-2.5 py-0.5 rounded-full">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Ahorrás {formatCRC(product.oldPrice - product.price)}
                </span>
              </motion.div>
            )}
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
