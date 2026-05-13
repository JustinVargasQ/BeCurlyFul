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
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={filled ? 'text-amber-400' : 'text-ink-200'}>
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const StarBadgeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const ZoomIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

/* ── Review stars interactive ── */
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

/* ── Reviews section ── */
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
    setSubmitting(true);
    setErrorMsg('');
    try {
      const pid = product?._id || product?.id;
      const { default: api } = await import('../lib/api');
      await api.post('/product-reviews', { productId: pid, rating, comment });
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'No se pudo enviar la reseña');
    }
    finally { setSubmitting(false); }
  };

  return (
    <section className="mt-20 border-t border-cream-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="font-display text-2xl font-semibold text-ink-900 mb-8">
          Reseñas de clientes
          {reviews.length > 0 && <span className="text-base font-normal text-ink-400 ml-2">({reviews.length})</span>}
        </h2>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Review list */}
          <div>
            {loadingR ? (
              <div className="space-y-3">
                {[1,2].map((i) => <div key={i} className="h-20 bg-cream-50 rounded-2xl animate-pulse" />)}
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-cream-50 rounded-2xl p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-white mx-auto mb-3 flex items-center justify-center text-amber-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <p className="text-sm text-ink-400">Sé el primero en dejar una reseña.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r._id} className="bg-white border border-cream-100 rounded-2xl p-5 shadow-card">
                    <div className="flex items-center gap-3 mb-2">
                      {r.authorAvatar ? (
                        <img src={r.authorAvatar} alt={r.authorName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-bold text-xs flex-shrink-0">
                          {r.authorName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-ink-900 text-sm">{r.authorName}</p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <svg key={s} width="12" height="12" viewBox="0 0 24 24"
                              fill={s <= r.rating ? 'currentColor' : 'none'}
                              stroke="currentColor" strokeWidth="2"
                              className={s <= r.rating ? 'text-amber-400' : 'text-ink-200'}>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          ))}
                        </div>
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

          {/* Submit form */}
          <div className="bg-cream-50 rounded-2xl p-6 h-fit">
            <h3 className="font-semibold text-ink-900 mb-4">Dejar una reseña</h3>
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-50 mx-auto mb-3 flex items-center justify-center text-green-500">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="font-semibold text-ink-900">¡Gracias por tu reseña!</p>
                <p className="text-sm text-ink-400 mt-1">Será publicada después de revisión.</p>
              </div>
            ) : !user ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 mx-auto mb-3 flex items-center justify-center text-rose-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <p className="font-semibold text-ink-900 mb-1">Iniciá sesión para dejar tu reseña</p>
                <p className="text-xs text-ink-500 mb-4">Solo tarda un segundo con tu cuenta de Google</p>
                <button onClick={() => setShowLogin(true)}
                  className="bg-ink-900 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-full transition-colors text-sm shadow-btn">
                  Iniciar sesión con Google
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* User identity (auto-filled, read-only) */}
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-cream-200">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                      {user.name?.[0]?.toUpperCase()}
                    </span>
                  )}
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
                    className="w-full border border-cream-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 transition-colors resize-none bg-white" />
                </div>
                {errorMsg && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {errorMsg}
                  </p>
                )}
                <button type="submit" disabled={submitting || !rating}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-50">
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
  const [qty, setQty]               = useState(1);
  const [added, setAdded]           = useState(false);
  const [activeImg, setActiveImg]   = useState(0);
  const [zoomed, setZoomed]         = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [restockPhone, setRestockPhone]         = useState('');
  const [restockSent, setRestockSent]           = useState(false);
  const [restockLoading, setRestockLoading]     = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [slug]);


  const cat = product?.cat || 'todos';
  const { products: related } = useProducts({ cat });

  if (loading) {
    return (
      <main className="pt-24 pb-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-4 w-48 skeleton rounded-full mb-10" />
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
            {/* Image skeleton */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 w-[70px] flex-shrink-0">
                {[0,1,2].map((i) => <div key={i} className="w-[70px] h-[70px] skeleton rounded-xl" />)}
              </div>
              <div className="flex-1 skeleton rounded-2xl" style={{ aspectRatio: '1' }} />
            </div>
            {/* Info skeleton */}
            <div className="space-y-4">
              <div className="skeleton h-6 w-32 rounded-full" />
              <div className="skeleton h-10 w-3/4 rounded-xl" />
              <div className="skeleton h-10 w-2/4 rounded-xl" />
              <div className="skeleton h-14 w-full rounded-2xl mt-6" />
              <div className="skeleton h-14 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 pt-24">
        <p className="text-ink-400 text-lg">Producto no encontrado.</p>
        <Link to="/" className="text-rose-500 font-semibold hover:underline">Volver a la tienda</Link>
      </div>
    );
  }

  const images   = product.images?.length ? product.images : [product.img].filter(Boolean);
  // Si la variante elegida tiene imagen propia, esa pisa la principal.
  // Asi al cambiar 'Tono' a 'Rosado' la foto cambia a la del rosado.
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
  const mainImg  = variantImage || images[activeImg] || images[0] || '';
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const relatedProducts = related.filter((p) => p.slug !== slug).slice(0, 6);
  const deliveryRange = getDeliveryRange();

  const handleAdd = () => {
    addItem(product, qty);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  };

  /* Pedir ahora: agrega al carrito y va al formulario (registra el pedido) */
  const handleBuyNow = () => {
    addItem(product, qty);
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

  const shareWa = () => {
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Mira este producto en JD Virtual: ${product.name} - ${url}`)}`, '_blank');
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  const productImage = assetUrl(product.images?.[0] || product.img || '');

  return (
    <main className="pt-24 pb-20 bg-white">
      <SEO
        title={`${product.name} — ${product.brand}`}
        description={product.description
          ? product.description.slice(0, 155)
          : `${product.name} de ${product.brand}. Comprá online con envío a Costa Rica.`}
        image={productImage || undefined}
        url={`/producto/${product.slug}`}
        type="product"
        product={product}
      />

      {/* ── Main product section ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-ink-400 mb-8 flex-wrap">
          <Link to="/" className="hover:text-rose-500 transition-colors">Tienda</Link>
          <span className="text-ink-200">/</span>
          <Link to={`/?cat=${product.cat}`} className="hover:text-rose-500 transition-colors capitalize">{product.cat}</Link>
          <span className="text-ink-200">/</span>
          <span className="text-ink-600 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ── Left: Image gallery ── */}
          <div className="flex gap-3">
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex flex-col gap-2 w-[70px] flex-shrink-0">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-[70px] h-[70px] rounded-xl overflow-hidden border-2 transition-all duration-200 ${activeImg === i ? 'border-rose-400 shadow-md' : 'border-cream-200 opacity-70 hover:opacity-100'}`}>
                    <img src={optimizedImage(src, 200)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="relative flex-1 group">
              <div
                className="aspect-square bg-cream-50 rounded-2xl overflow-hidden cursor-zoom-in shadow-sm"
                onClick={() => setZoomed(true)}>
                <img src={optimizedImage(mainImg, 1000)} alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  decoding="async" />
              </div>

              {/* Zoom button */}
              <button onClick={() => setZoomed(true)}
                className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-ink-600 hover:text-rose-500 shadow transition-all opacity-0 group-hover:opacity-100">
                <ZoomIcon />
              </button>

              {/* Badges */}
              {discount > 0 && (
                <span className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  -{discount}%
                </span>
              )}
              {product.badge && !discount && (
                <span className="absolute top-3 left-3 bg-ink-900 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
                  {product.badge}
                </span>
              )}
            </div>
          </div>

          {/* ── Right: Product info ── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.3, 1, 0.3, 1], delay: 0.1 }}
            className="flex flex-col">

            {/* Delivery estimate */}
            <div className="flex items-center gap-2 text-sm font-medium text-ink-600 bg-cream-50 border border-cream-200 rounded-xl px-4 py-2.5 mb-5 w-fit">
              <TruckIcon />
              <span>Entrega estimada <strong className="text-ink-900">{deliveryRange}</strong></span>
            </div>

            {/* Brand + Name */}
            <p className="text-rose-500 font-semibold text-xs tracking-widest uppercase mb-1.5">{product.brand || 'JD Virtual'}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 leading-snug mb-3">{product.name}</h1>

            {/* Rating */}
            {product.reviews > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <StarIcon key={s} filled={s <= Math.round(product.rating)} />)}</div>
                <span className="font-semibold text-sm text-ink-700">{product.rating}</span>
                <span className="text-ink-400 text-sm">({product.reviews} reseñas)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-display text-4xl font-bold text-ink-900">{formatCRC(product.price)}</span>
              {product.oldPrice && (
                <span className="text-lg text-ink-400 line-through">{formatCRC(product.oldPrice)}</span>
              )}
              {discount > 0 && (
                <span className="text-sm font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">-{discount}%</span>
              )}
            </div>
            <p className="text-xs text-ink-400 mb-5">Impuestos incluidos · Envío coordinado</p>

            {/* Stock urgency */}
            {product.stock > 0 && product.stock <= 10 && (
              <div className="mb-5">
                <p className="text-sm font-semibold text-emerald-600 mb-1.5">
                  Date prisa, solo quedan {product.stock} artículo{product.stock !== 1 ? 's' : ''} en stock.
                </p>
                <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (product.stock / 10) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-ink-500 text-sm leading-relaxed mb-5">{product.description}</p>
            )}

            {/* Features */}
            {product.features?.length > 0 && (
              <ul className="space-y-1.5 mb-5">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                    <CheckIcon /> {f}
                  </li>
                ))}
              </ul>
            )}

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="space-y-4 mb-5">
                {product.variants.map((v) => (
                  <div key={v.name}>
                    <p className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                      {v.name}: <span className="text-rose-500 normal-case font-semibold">{selectedVariants[v.name] || 'Seleccionar'}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {v.options.map((rawOpt) => {
                        const opt = typeof rawOpt === 'string' ? { value: rawOpt, image: '' } : rawOpt;
                        const isOn = selectedVariants[v.name] === opt.value;
                        return (
                          <button key={opt.value}
                            onClick={() => setSelectedVariants((s) => ({ ...s, [v.name]: opt.value }))}
                            className={`flex items-center gap-2 pl-1 pr-3.5 py-1 rounded-full text-sm border-2 font-medium transition-all ${
                              isOn ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-cream-200 text-ink-700 hover:border-rose-300'
                            }`}>
                            {opt.image ? (
                              <img src={optimizedImage(opt.image, 64)} alt={opt.value}
                                className={`w-7 h-7 rounded-full object-cover ring-1 ${isOn ? 'ring-rose-300' : 'ring-cream-200'}`}
                                loading="lazy" decoding="async" />
                            ) : (
                              <span className="w-7 h-7" />
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

            {/* Out of stock — restock form */}
            {product.stock === 0 && (
              <div className="mb-5 bg-cream-50 border border-cream-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-ink-700 mb-3">Avisame cuando vuelva a haber stock</p>
                {restockSent ? (
                  <p className="text-sm text-green-600 font-medium">Listo! Te avisamos por WhatsApp cuando este disponible.</p>
                ) : (
                  <div className="flex gap-2">
                    <input value={restockPhone} onChange={(e) => setRestockPhone(e.target.value)}
                      placeholder="Tu WhatsApp (ej: 8804-5100)"
                      className="flex-1 border border-cream-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 transition-colors" />
                    <button onClick={handleRestock} disabled={restockLoading || !restockPhone.trim()}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold bg-ink-900 text-white hover:bg-rose-500 transition-colors disabled:opacity-50">
                      {restockLoading ? '...' : 'Avisar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Qty + CTA */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-cream-200 rounded-xl overflow-hidden bg-cream-50">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-11 flex items-center justify-center hover:bg-cream-100 text-ink-600 transition-colors text-xl font-light">−</button>
                <span className="w-10 text-center font-semibold text-ink-900 text-sm">{qty}</span>
                <button onClick={() => setQty(qty + 1)}
                  className="w-10 h-11 flex items-center justify-center hover:bg-cream-100 text-ink-600 transition-colors text-xl font-light">+</button>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <button onClick={handleAdd}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${added ? 'bg-emerald-500 text-white scale-[0.98]' : 'bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white shadow-btn'}`}>
                {added ? '✓ Agregado al carrito' : 'Añadir a la cesta'}
              </button>
              <motion.button
                onClick={() => toggleFav(product)}
                aria-label={isFav(product) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                whileTap={{ scale: 0.85 }}
                animate={isFav(product) ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.35, ease: [0.3, 1, 0.3, 1] }}
                className={`w-[52px] flex-shrink-0 flex items-center justify-center rounded-xl border-2 transition-all duration-200 ${
                  isFav(product)
                    ? 'bg-rose-500 border-rose-500 text-white shadow-btn'
                    : 'bg-white border-cream-200 hover:border-rose-400 text-ink-500 hover:text-rose-500'
                }`}>
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill={isFav(product) ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </motion.button>
            </div>
            <div className="flex gap-3 mb-3">
              <button onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1db954] active:scale-[0.98] text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-200">
                <WaIcon /> Pedir por WhatsApp
              </button>
            </div>

            {/* Apartar — boton full-width con caption descriptiva debajo */}
            <a
              href={`https://wa.me/50688045100?text=${encodeURIComponent(`Hola 💕 Quiero apartar este producto: ${product.name} (₡${product.price.toLocaleString('es-CR')}). ¿Cómo procedemos?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full flex items-center justify-center gap-2 px-4 py-3 mb-1.5 rounded-xl text-sm font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 hover:text-rose-800 transition-all">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-rotate-6">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <circle cx="8" cy="15" r="1" fill="currentColor"/>
              </svg>
              <span>Apartar este producto</span>
              <span className="hidden sm:inline text-rose-500/70 font-normal">·</span>
              <span className="hidden sm:inline text-rose-600 font-bold">50% adelantado</span>
            </a>
            <p className="text-[11px] text-ink-400 text-center mb-5 leading-relaxed">
              Te lo reservamos por 1 mes 💕{' '}
              <Link to="/apartados" className="text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-2 decoration-rose-300 hover:decoration-rose-500">
                ¿cómo funciona?
              </Link>
            </p>

            {/* Share */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs text-ink-400 font-medium">Compartir:</span>
              <button onClick={shareWa}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button onClick={shareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-cream-100 text-ink-600 hover:bg-cream-200 transition-colors border border-cream-200">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Copiar link
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2.5 border-t border-cream-100 pt-5">
              {[
                { icon: <ShieldIcon />,    label: 'Pago seguro',       bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
                { icon: <StarBadgeIcon />, label: 'Producto original', bg: 'rgba(184,95,114,0.1)',  color: '#B85F72' },
                { icon: <TruckIcon />,     label: 'Envío coordinado',  bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
              ].map(({ icon, label, bg, color }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex flex-col items-center gap-2 text-center p-3 rounded-xl"
                  style={{ background: bg }}>
                  <span style={{ color }}>{icon}</span>
                  <span className="text-[11px] font-semibold leading-tight" style={{ color }}>{label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Related products ── */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 bg-cream-50 py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-semibold text-ink-900 mb-8 text-center">
              También te puede gustar&hellip;
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id || p.slug} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Reviews ── */}
      <ReviewsSection product={product} />

      {/* ── Mobile sticky buy bar ── */}
      <AnimatePresence>
        {!added && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed bottom-0 inset-x-0 z-40 p-3 sm:hidden"
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex gap-2.5 max-w-md mx-auto">
              <button
                onClick={handleAdd}
                disabled={product.stock === 0}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${
                  product.stock === 0 ? 'bg-cream-200 text-ink-400' :
                  added ? 'bg-green-500 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-btn'
                }`}>
                {added ? '✓ Agregado' : product.stock === 0 ? 'Agotado' : 'Añadir al carrito'}
              </button>
              <button onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1db954] text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-lg">
                <WaIcon /> Pedir ya
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zoom lightbox ── */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            style={{ background: 'rgba(10,6,8,0.92)', backdropFilter: 'blur(12px)' }}
            onClick={() => setZoomed(false)}>

            {/* Image */}
            <motion.img
              src={optimizedImage(mainImg, 1400)}
              alt={product.name}
              decoding="async"
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.3, 1, 0.3, 1] }}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              style={{ maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2"
                onClick={(e) => e.stopPropagation()}>
                {images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImg === i ? 'border-white' : 'border-white/30 opacity-60 hover:opacity-100'
                    }`}>
                    <img src={optimizedImage(src, 200)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}

            {/* Close */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
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
