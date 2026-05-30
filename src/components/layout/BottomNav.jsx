import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';

const HomeIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? '0' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const SearchIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? '0' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const BagIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? '0' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <path d="M3 6h18"/>
    <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.8" fill="none"/>
  </svg>
);

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { count, openCart } = useCart();
  const { count: favCount } = useWishlist();

  const isHome  = pathname === '/';
  const isFavs  = pathname === '/favoritos';

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('bcf:open-search'));
  };

  const goHome = () => {
    if (isHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const TABS = [
    {
      key: 'home',
      label: 'Inicio',
      active: isHome,
      action: goHome,
      icon: (active) => <HomeIcon filled={active} />,
    },
    {
      key: 'search',
      label: 'Buscar',
      active: false,
      action: openSearch,
      icon: (active) => <SearchIcon filled={active} />,
    },
    {
      key: 'favs',
      label: 'Favoritos',
      active: isFavs,
      badge: favCount,
      action: () => navigate('/favoritos'),
      icon: (active) => <HeartIcon filled={active} />,
    },
    {
      key: 'cart',
      label: 'Carrito',
      active: false,
      badge: count,
      action: openCart,
      icon: () => <BagIcon filled={count > 0} />,
    },
  ];

  return (
    /* Solo visible en mobile (< sm). Oculto en ≥ 640px. */
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Separador rosa suave */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-200 to-transparent" />

      {/* Barra */}
      <div
        className="flex items-stretch bg-white/90"
        style={{ backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={tab.action}
            aria-label={tab.label}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors duration-200 ${
              tab.active ? 'text-rose-500' : 'text-ink-400 active:text-rose-400'
            }`}>

            {/* Indicador activo — dot debajo del icono */}
            {tab.active && (
              <motion.span
                layoutId="bottom-nav-indicator"
                className="absolute -top-px left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-full bg-rose-500"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}

            <div className="relative">
              {tab.icon(tab.active)}
              {/* Badge */}
              <AnimatePresence>
                {tab.badge > 0 && (
                  <motion.span
                    key={`badge-${tab.key}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <span className={`text-[10px] font-semibold leading-none transition-colors ${tab.active ? 'text-rose-500' : 'text-ink-400'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
