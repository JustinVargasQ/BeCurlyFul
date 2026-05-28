import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useWishlist from '../hooks/useWishlist';
import useCart from '../hooks/useCart';
import { formatCRC } from '../lib/currency';
import SEO from '../components/ui/SEO';

const HeartIcon = ({ filled = true, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);
const CartPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

export default function Wishlist() {
  const { items, remove, clear }    = useWishlist();
  const { addItem, openCart }       = useCart();

  const handleAdd = (product) => {
    addItem(product, 1);
    openCart();
  };

  return (
    <main className="min-h-screen bg-cream-50 pt-8 pb-20">
      <SEO title="Mis favoritos" url="/favoritos" noindex />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-500 mb-1">
              <HeartIcon size={14} /> Mis favoritos
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-900">
              Tu lista de deseos
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              {items.length === 0
                ? 'Aún no has guardado productos.'
                : `${items.length} ${items.length === 1 ? 'producto guardado' : 'productos guardados'}`}
            </p>
          </div>

          {items.length > 0 && (
            <button onClick={clear}
              className="hidden sm:flex items-center gap-2 text-sm text-ink-500 hover:text-rose-500 transition-colors px-3 py-2 rounded-lg hover:bg-rose-50">
              <TrashIcon /> Vaciar
            </button>
          )}
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl border border-cream-200 py-16 px-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-400 mb-5">
              <HeartIcon size={36} filled={false} />
            </div>
            <h2 className="font-display text-xl font-bold text-ink-900 mb-2">
              Tu lista está vacía
            </h2>
            <p className="text-sm text-ink-500 max-w-sm mx-auto mb-6">
              Toca el corazón en los productos que te gusten y guárdalos aquí para no olvidarlos.
            </p>
            <Link to="/"
              className="inline-flex items-center gap-2 bg-ink-900 hover:bg-rose-500 text-white font-semibold px-6 py-3 rounded-full transition-colors">
              Explorar productos
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            <AnimatePresence>
              {items.map((p) => {
                const img = p.img || p.images?.[0] || '';
                return (
                  <motion.div key={p.id ?? p._id ?? p.slug}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-2xl border border-cream-200 overflow-hidden group hover:shadow-card-hover hover:border-rose-200 transition-all">
                    <Link to={`/producto/${p.slug}`}
                      className="block relative bg-cream-50 overflow-hidden" style={{ aspectRatio: '1' }}>
                      {img ? (
                        <img src={img} alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-cream-200" />
                      )}
                      <button onClick={(e) => { e.preventDefault(); remove(p); }}
                        aria-label="Quitar de favoritos"
                        className="absolute top-2.5 right-2.5 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 text-rose-500 hover:bg-rose-500 hover:text-white shadow-md transition-colors">
                        <HeartIcon size={18} filled />
                      </button>
                    </Link>
                    <div className="p-3 sm:p-4">
                      <p className="text-[10px] text-ink-400 font-semibold uppercase tracking-widest mb-1">{p.brand || 'Be Curly Full CR'}</p>
                      <Link to={`/producto/${p.slug}`}
                        className="text-sm font-semibold text-ink-900 leading-snug line-clamp-2 hover:text-rose-500 transition-colors block mb-2">
                        {p.name}
                      </Link>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="font-bold text-ink-900 text-sm">{formatCRC(p.price)}</span>
                        {p.oldPrice && (
                          <span className="text-xs text-ink-300 line-through">{formatCRC(p.oldPrice)}</span>
                        )}
                      </div>
                      <button onClick={() => handleAdd(p)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-ink-900 text-white hover:bg-rose-500 transition-colors">
                        <CartPlusIcon /> Al carrito
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
