import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProduct, useProducts } from '../hooks/useProducts';
import useCart from '../hooks/useCart';
import useWishlist from '../hooks/useWishlist';
import { formatCRC } from '../lib/currency';
import { assetUrl, optimizedImage } from '../lib/api';
import ProductCard from '../components/ui/ProductCard';
import SEO from '../components/ui/SEO';
import LoginModal from '../components/ui/LoginModal';
import useUserStore from '../store/userStore';

/* ── Icons ── */
const StarIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
    className={filled ? 'text-amber-400' : 'text-ink-200'}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 flex-shrink-0 mt-0.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const TruckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const StarBadgeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const ZoomIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

function getDeliveryRange() {
  const today = new Date();
  const from = new Date(today); from.setDate(today.getDate() + 3);
  const to   = new Date(today); to.setDate(today.getDate() + 6);
  const fmt = (d) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
  return `${fmt(from)} - ${fmt(to)}`;
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((s) => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110">
          <svg width="22" height="22" viewBox="0 0 24 24"
            fill={(hover || value) >= s ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2"
            className={(hover || value) >= s ? 'text-amber-400' : 'text-ink-200'}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ product }) {
  const [reviews, setReviews]       = useState([]);
  const [loadingR, setLoadingR]     = useState(true);
  const [rating, setRating]         = useState(0);
  const [comment, setComment]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showLogin, setShowLogin]   = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    const pid = product?._id || product?.id;
    if (!pid || !import.meta.env.VITE_API_URL) { setLoadingR(false); return; }
    import('../lib/api').then(({ default: api }) =>
      api.get(`/product-reviews/${pid}`)
        .then(({ data }) => setReviews(data))
        .catch(() => {})
        .finally(() => setLoadingR(false))
    );
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { setShowLogin(true); return; }
    if (!rating) return;
    setSubmitting(true); setErrorMsg('');
    try {
      const pid = product?._id || product?.id;
      const { default: api } = await import('../lib/api');
      await api.post('/product-reviews', { productId: pid, rating, comment });
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'No se pudo enviar la reseña');
    } finally { setSubmitting(false); }
  };

  return (
    <section className="mt-12 border-t border-cream-200 bg-cream-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center mb-8">
          <span className="section-label">Reseñas</span>
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            Lo que dicen nuestras clientas
            {reviews.length > 0 && <span className="text-base font-normal text-ink-400 ml-2">({reviews.length})</span>}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            {loadingR ? (
              <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-cream-200" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-cream-200">
                <p className="text-sm text-ink-400">Sé la primera en dejar una reseña.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r._id} className="bg-white border border-cream-200 rounded-2xl p-5 shadow-soft">
                    <div className="flex items-center gap-3 mb-2">
                      {r.authorAvatar
                        ? <img src={r.authorAvatar} alt={r.authorName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-bold text-xs flex-shrink-0">{r.authorName?.[0]?.toUpperCase() || '?'}</div>
                      }
                      <div>
                        <p className="font-semibold text-ink-900 text-sm">{r.authorName}</p>
                        <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <StarIcon key={s} filled={s <= r.rating} />)}</div>
                      </div>
                      <span className="ml-auto text-xs text-ink-400">
                        {new Date(r.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-ink-700 leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-cream-200 p-6 h-fit shadow-soft">
            <h3 className="font-semibold text-ink-900 mb-4">Dejar una reseña</h3>
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-50 mx-auto mb-3 flex items-center justify-center text-green-500">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="font-semibold text-ink-900">¡Gracias por tu reseña!</p>
                <p className="text-sm text-ink-400 mt-1">Será publicada después de revisión.</p>
              </div>
            ) : !user ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 mx-auto mb-3 flex items-center justify-center text-rose-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <p className="font-semibold text-ink-900 mb-1">Iniciá sesión para dejar tu reseña</p>
                <p className="text-xs text-ink-500 mb-4">Solo tarda un segundo con tu cuenta de Google</p>
                <button onClick={() => setShowLogin(true)} className="btn-primary text-sm px-6 py-2.5">
                  Iniciar sesión con Google
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200">
                  {user.picture
                    ? <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                    : <span className="w-9 h-9 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">{user.name?.[0]?.toUpperCase()}</span>
                  }
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-ink-400 truncate">Reseña verificada</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-1.5 block">Calificación</label>
                  <StarPicker value={rating} onChange={setRating} />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-1.5 block">Comentario (opcional)</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                    placeholder="¿Qué te pareció el producto?"
                    className="w-full border border-cream-200 rounded-xl px-3 py-2.5 text-sm bg-cream-50 focus:outline-none focus:border-rose-400 transition-colors resize-none" />
                </div>
                {errorMsg && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>}
                <button type="submit" disabled={submitting || !rating}
                  className="w-full btn-primary py-3 disabled:opacity-50">
                  {submitting ? 'Enviando...' : 'Enviar reseña'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        title="Iniciá sesión para reseñar"
        subtitle="Tu reseña aparecerá con tu nombre y foto de Google" />
    </section>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const { product, loading } = useProduct(slug);
  const { addItem, openCart } = useCart();
  const { has: isFav, toggle: toggleFav } = useWishlist();
  const navigate = useNavigate();
  const [qty, setQty]                               = useState(1);
  const [added, setAdded]                           = useState(false);
  const [activeImg, setActiveImg]                   = useState(0);
  const [zoomed, setZoomed]                         = useState(false);
  const [selectedVariants, setSelectedVariants]     = useState({});
  const [restockPhone, setRestockPhone]             = useState('');
  const [restockSent, setRestockSent]               = useState(false);
  const [restockLoading, setRestockLoading]         = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [slug]);

  const cat = product?.cat || 'todos';
  const { products: related } = useProducts({ cat });

  if (loading) {
    return (
      <main className="bg-cream-50 pb-20">
        <div className="sm:hidden skeleton" style={{ aspectRatio: '1' }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-4">
          <div className="skeleton h-4 w-40 rounded-full" />
          <div className="skeleton h-9 w-3/4 rounded-xl" />
          <div className="skeleton h-9 w-2/4 rounded-xl" />
          <div className="skeleton h-14 w-full rounded-2xl mt-6" />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-cream-50">
        <p className="text-ink-400 text-lg">Producto no encontrado.</p>
        <Link to="/" className="text-rose-500 font-semibold hover:underline">Volver a la tienda</Link>
      </div>
    );
  }

  const images   = product.images?.length ? product.images : [product.img].filter(Boolean);
  const variantImage = (() => {
    if (!Array.isArray(product.variants)) return null;
    for (const v of product.variants) {
      const chosen = selectedVariants[v.name];
      if (!chosen) continue;
      const opt = v.options?.find((o) => (typeof o === 'string' ? o : o.value) === chosen);
      if (opt && typeof opt === 'object' && opt.image) return opt.image;
    }
    return null;
  })();
  const mainImg        = variantImage || images[activeImg] || images[0] || '';
  const discount       = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const relatedProducts = related.filter((p) => p.slug !== slug).slice(0, 4);
  const deliveryRange  = getDeliveryRange();
  const requiredVariants = Array.isArray(product.variants) ? product.variants : [];
  const missingVariant = requiredVariants.find((v) => !selectedVariants[v.name]);
  const productWithVariants = requiredVariants.length > 0 && Object.keys(selectedVariants).length > 0
    ? { ...product, selectedVariants } : product;

  const handleAdd = () => {
    if (missingVariant) return;
    addItem(productWithVariants, qty);
    setAdded(true); openCart();
    setTimeout(() => setAdded(false), 2000);
  };
  const handleBuyNow = () => {
    if (missingVariant) return;
    addItem(productWithVariants, qty);
    navigate('/checkout');
  };
  const handleRestock = async () => {
    if (!restockPhone.trim()) return;
    setRestockLoading(true);
    try {
      const USE_API = import.meta.env.VITE_API_URL;
      if (USE_API) {
        const { default: api } = await import('../lib/api');
        await api.post('/restock', { productId: product.id || product._id, phone: restockPhone.trim() });
      }
      setRestockSent(true);
    } catch { setRestockSent(true); }
    finally { setRestockLoading(false); }
  };
  const shareWa   = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Mirá este producto de Be Curlyful CR: ${product.name} - ${window.location.href}`)}`, '_blank');
  const shareLink = () => { if (navigator.share) navigator.share({ title: product.name, url: window.location.href }); else navigator.clipboard?.writeText(window.location.href); };
  const productImage = assetUrl(product.images?.[0] || product.img || '');

  return (
    /* pb-36 mobile: sticky bar (~58px) + BottomNav (~64px) */
    <main className="bg-cream-50 pb-36 sm:pb-20">
      <SEO
        title={`${product.name} — ${product.brand}`}
        description={product.description ? product.description.slice(0, 155) : `${product.name} de ${product.brand}. Comprá online con envío a Costa Rica.`}
        image={productImage || undefined}
        url={`/producto/${product.slug}`}
        type="product"
        product={product}
      />

      {/* ══ MOBILE imagen full-bleed ══ */}
      <div className="sm:hidden bg-white">
        <div className="relative w-full overflow-hidden cursor-zoom-in" style={{ aspectRatio: '1' }}
          onClick={() => setZoomed(true)}>
          <motion.img
            key={activeImg}
            src={optimizedImage(mainImg, 800)} alt={product.name}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
            className="w-full h-full object-cover" decoding="async" />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {discount > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">-{discount}%</span>}
            {product.badge && !discount && <span className="bg-ink-900 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">{product.badge}</span>}
          </div>
          {/* Wishlist */}
          <motion.button onClick={(e) => { e.stopPropagation(); toggleFav(product); }}
            aria-label={isFav(product) ? 'Quitar de favoritos' : 'Guardar'}
            whileTap={{ scale: 0.82 }}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-card backdrop-blur-md ${isFav(product) ? 'bg-rose-500 text-white' : 'bg-white/80 text-ink-500'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav(product) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </motion.button>
        </div>
        {/* Thumbnails horizontales */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-cream-200">
            {images.map((src, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImg === i ? 'border-rose-400' : 'border-cream-200 opacity-60'}`}>
                <img src={optimizedImage(src, 120)} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══ Contenido principal ══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 sm:pt-8">

        {/* Breadcrumb desktop */}
        <nav className="hidden sm:flex items-center gap-2 text-sm text-ink-400 mb-8 flex-wrap">
          <Link to="/" className="hover:text-rose-500 transition-colors">Tienda</Link>
          <span className="text-ink-200">/</span>
          <Link to={`/?cat=${product.cat}`} className="hover:text-rose-500 transition-colors capitalize">{product.cat}</Link>
          <span className="text-ink-200">/</span>
          <span className="text-ink-600 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-14 items-start">

          {/* Desktop gallery */}
          <div className="hidden sm:flex gap-3">
            {images.length > 1 && (
              <div className="flex flex-col gap-2 w-[68px] flex-shrink-0">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-[68px] h-[68px] rounded-xl overflow-hidden border-2 transition-all ${activeImg === i ? 'border-rose-400 shadow-sm' : 'border-cream-200 opacity-60 hover:opacity-100'}`}>
                    <img src={optimizedImage(src, 180)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 group">
              <div className="aspect-square bg-white rounded-2xl overflow-hidden cursor-zoom-in shadow-card"
                onClick={() => setZoomed(true)}>
                <img src={optimizedImage(mainImg, 900)} alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" decoding="async" />
              </div>
              <button onClick={() => setZoomed(true)}
                className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-ink-500 hover:text-rose-500 shadow-soft opacity-0 group-hover:opacity-100 transition-all">
                <ZoomIcon />
              </button>
              {discount > 0 && <span className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{discount}%</span>}
              {product.badge && !discount && <span className="absolute top-3 left-3 bg-ink-900 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">{product.badge}</span>}
            </div>
          </div>

          {/* Info */}
          <div className="pt-5 sm:pt-0 flex flex-col">

            <span className="section-label !mb-2">{product.brand || 'Be Curlyful CR'}</span>

            <h1 className="font-display font-semibold text-ink-900 leading-[1.05] tracking-[-0.01em] mb-3"
              style={{ fontSize: 'clamp(1.65rem, 5.5vw, 2.5rem)' }}>
              {product.name}
            </h1>

            {product.reviews > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <StarIcon key={s} filled={s <= Math.round(product.rating)} />)}</div>
                <span className="font-semibold text-sm text-ink-700">{product.rating}</span>
                <span className="text-ink-400 text-sm">({product.reviews})</span>
              </div>
            )}

            {/* Precio */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-display font-semibold tabular-nums" style={{ fontSize: 'clamp(1.7rem, 6vw, 2.1rem)', color: '#231A1B' }}>
                {formatCRC(product.price)}
              </span>
              {product.oldPrice && <span className="text-base text-ink-400 line-through">{formatCRC(product.oldPrice)}</span>}
              {discount > 0 && <span className="text-sm font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">-{discount}%</span>}
            </div>
            <p className="text-xs text-ink-400 mb-4">Impuestos incluidos · Envío coordinado</p>

            {/* Entrega */}
            <div className="flex items-center gap-2 text-sm font-medium text-ink-600 bg-white border border-cream-200 rounded-full px-4 py-2 mb-5 w-fit shadow-soft">
              <TruckIcon />
              <span>Entrega estimada <strong className="text-ink-900">{deliveryRange}</strong></span>
            </div>

            {/* Stock urgency */}
            {product.stock > 0 && product.stock <= 10 && (
              <div className="mb-4 bg-amber-50 rounded-2xl border border-amber-200 px-4 py-3">
                <p className="text-sm font-semibold text-amber-700 mb-1.5">Solo quedan {product.stock} {product.stock !== 1 ? 'unidades' : 'unidad'}</p>
                <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (product.stock / 10) * 100)}%` }} />
                </div>
              </div>
            )}

            {product.description && (
              <p className="text-ink-500 text-[15px] leading-relaxed mb-5 text-pretty">{product.description}</p>
            )}

            {product.features?.length > 0 && (
              <ul className="space-y-2 mb-5">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink-700">
                    <CheckIcon /> {f}
                  </li>
                ))}
              </ul>
            )}

            {/* Variantes */}
            {product.variants?.length > 0 && (
              <div className="space-y-4 mb-5 bg-white rounded-2xl border border-cream-200 p-4 shadow-soft">
                {product.variants.map((v) => (
                  <div key={v.name}>
                    <p className="text-[11px] font-bold text-ink-400 uppercase tracking-[0.18em] mb-2">
                      {v.name}: <span className="text-rose-500 normal-case font-semibold">{selectedVariants[v.name] || 'Elegí una opción'}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {v.options.map((rawOpt) => {
                        const opt = typeof rawOpt === 'string' ? { value: rawOpt, image: '' } : rawOpt;
                        const isOn = selectedVariants[v.name] === opt.value;
                        return (
                          <button key={opt.value}
                            onClick={() => setSelectedVariants((s) => ({ ...s, [v.name]: opt.value }))}
                            className={`flex items-center gap-1.5 pl-1 pr-3.5 py-1.5 rounded-full text-sm border-2 font-medium transition-all ${isOn ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-cream-200 text-ink-700 hover:border-rose-300'}`}>
                            {opt.image && (
                              <img src={optimizedImage(opt.image, 64)} alt={opt.value}
                                className={`w-7 h-7 rounded-full object-cover ring-1 ${isOn ? 'ring-rose-300' : 'ring-cream-200'}`} loading="lazy" />
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

            {/* Sin stock */}
            {product.stock === 0 && (
              <div className="mb-5 bg-white border border-cream-200 rounded-2xl p-4 shadow-soft">
                <p className="text-sm font-semibold text-ink-700 mb-3">Avisame cuando vuelva a haber stock</p>
                {restockSent ? (
                  <p className="text-sm text-green-600 font-medium">¡Listo! Te avisamos por WhatsApp.</p>
                ) : (
                  <div className="flex gap-2">
                    <input value={restockPhone} onChange={(e) => setRestockPhone(e.target.value)}
                      placeholder="Tu WhatsApp (ej: 7212-5261)"
                      className="flex-1 border border-cream-200 rounded-xl px-3 py-2.5 text-sm bg-cream-50 focus:outline-none focus:border-rose-400 transition-colors" />
                    <button onClick={handleRestock} disabled={restockLoading || !restockPhone.trim()}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold bg-ink-900 text-white hover:bg-rose-500 transition-colors disabled:opacity-50">
                      {restockLoading ? '...' : 'Avisar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Qty + botones desktop */}
            <div className="hidden sm:block">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center bg-white border border-cream-200 rounded-full overflow-hidden shadow-soft">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-cream-100 text-ink-600 transition-colors text-lg">−</button>
                  <span className="w-10 text-center font-semibold text-ink-900">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-cream-100 text-ink-600 transition-colors text-lg">+</button>
                </div>
                <motion.button onClick={() => toggleFav(product)} aria-label="Favoritos"
                  whileTap={{ scale: 0.85 }}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${isFav(product) ? 'bg-rose-500 border-rose-500 text-white shadow-btn' : 'bg-white border-cream-200 text-ink-400 hover:border-rose-400 hover:text-rose-500'}`}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={isFav(product) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </motion.button>
              </div>

              {missingVariant && (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Elegí un {missingVariant.name.toLowerCase()} antes de continuar
                </p>
              )}

              <button onClick={handleAdd} disabled={!!missingVariant}
                className={`w-full btn-primary py-4 mb-3 disabled:opacity-50 disabled:cursor-not-allowed ${added ? '!bg-green-500' : ''}`}>
                {added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
              </button>
              <button onClick={handleBuyNow} disabled={!!missingVariant}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-semibold py-3.5 rounded-full mb-4 transition-colors shadow-card disabled:opacity-50">
                <WaIcon /> Pedir por WhatsApp
              </button>
            </div>

            {/* Apartar */}
            <a href={`https://wa.me/50672125261?text=${encodeURIComponent(`Hola, quiero apartar: ${product.name} (${formatCRC(product.price)}). ¿Cómo procedemos?`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 mb-1.5 rounded-full text-sm font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Apartar · 50% adelantado
            </a>
            <p className="text-[11px] text-ink-400 text-center mb-5">
              Reservamos por 1 mes ·{' '}
              <Link to="/apartados" className="text-rose-600 font-semibold underline underline-offset-2">¿Cómo funciona?</Link>
            </p>

            {/* Compartir */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs text-ink-400 font-medium">Compartir:</span>
              <button onClick={shareWa} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button onClick={shareLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-cream-100 text-ink-600 hover:bg-cream-200 border border-cream-200 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Copiar link
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2.5 border-t border-cream-200 pt-5">
              {[
                { icon: <ShieldIcon />,    label: 'Pago seguro',     bg: 'rgba(16,185,129,0.08)',  color: '#059669' },
                { icon: <StarBadgeIcon />, label: '100% original',   bg: 'rgba(206,108,141,0.08)', color: '#CE6C8D' },
                { icon: <TruckIcon />,     label: 'Envío a todo CR', bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' },
              ].map(({ icon, label, bg, color }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center p-3 rounded-2xl" style={{ background: bg }}>
                  <span style={{ color }}>{icon}</span>
                  <span className="text-[11px] font-semibold leading-tight" style={{ color }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Relacionados */}
      {relatedProducts.length > 0 && (
        <section className="mt-14 py-12" style={{ background: 'linear-gradient(180deg, #FCF4F7 0%, #FFFBF7 100%)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center mb-7">
              <span className="section-label">Completá tu rutina</span>
              <h2 className="section-title text-center">También te puede gustar</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((p, i) => <ProductCard key={p.id || p.slug} product={p} index={i} />)}
            </div>
          </div>
        </section>
      )}

      <ReviewsSection product={product} />

      {/* ══ MOBILE sticky bar — posicionada sobre el BottomNav ══ */}
      <div className="sm:hidden fixed bottom-16 inset-x-0 z-40 px-3 py-2"
        style={{ background: 'rgba(255,251,247,0.96)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(206,108,141,0.15)' }}>
        {missingVariant && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2 text-center">
            Elegí un {missingVariant.name.toLowerCase()} primero
          </p>
        )}
        <div className="flex gap-2.5">
          <button onClick={handleAdd} disabled={product.stock === 0 || !!missingVariant}
            className={`flex-1 py-3.5 rounded-full font-bold text-[15px] transition-all shadow-btn disabled:opacity-60 ${
              product.stock === 0 ? 'bg-cream-200 text-ink-400' :
              added ? 'bg-green-500 text-white' : 'bg-rose-500 text-white'
            }`}>
            {added ? '✓ Agregado' : product.stock === 0 ? 'Agotado' : 'Agregar al carrito'}
          </button>
          <button onClick={handleBuyNow} disabled={product.stock === 0 || !!missingVariant}
            className="flex items-center justify-center gap-1.5 bg-[#25D366] text-white font-bold py-3.5 px-5 rounded-full transition-colors shadow-card disabled:opacity-60">
            <WaIcon />
          </button>
        </div>
      </div>

      {/* Zoom lightbox */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            style={{ background: 'rgba(10,6,8,0.92)', backdropFilter: 'blur(12px)' }}
            onClick={() => setZoomed(false)}>
            <motion.img
              src={optimizedImage(mainImg, 1400)} alt={product.name} decoding="async"
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }} transition={{ duration: 0.28, ease: [0.3, 1, 0.3, 1] }}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" style={{ maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()} />
            {images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                {images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${activeImg === i ? 'border-white' : 'border-white/30 opacity-60 hover:opacity-100'}`}>
                    <img src={optimizedImage(src, 200)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
              onClick={() => setZoomed(false)}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-2xl font-light transition-colors backdrop-blur-sm">
              ×
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
