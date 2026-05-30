import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { formatCRC } from '../../lib/currency';
import api from '../../lib/api';
import { trackSearch } from '../../lib/analytics';
import UserButton from '../ui/UserButton';

const ANNOUNCEMENTS = [
  'Envíos a todo Costa Rica desde ₡2,000',
  'Productos 100% originales y auténticos',
  'Atención personalizada por WhatsApp · 7212-5261',
];

const CATEGORIES = [
  { label: 'Rizos',       path: '/?cat=rizos'       },
  { label: 'Limpieza',    path: '/?cat=limpieza'    },
  { label: 'Tratamiento', path: '/?cat=tratamiento' },
  { label: 'Kids',        path: '/?cat=kids'        },
  { label: 'Kits',        path: '/?cat=kits'        },
  { label: 'Todo',        path: '/'                 },
  { label: 'Ofertas',     path: '/ofertas', highlight: true },
];

/* ── Icons ── */
const SearchIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const CartIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const HeartNavIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const MenuIcon    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>;
const CloseIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const WaIcon      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

/* ── Category link — navigates + scrolls to catalog ── */
function NavCatLink({ cat, onNavigate, mobile }) {
  const navigate  = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    onNavigate?.();
    navigate(cat.path);
    // Si el destino es la home (con o sin filtro), scrollear al catalogo
    // despues del navigate. Antes verificabamos isHome ANTES de navegar, lo
    // cual fallaba al venir de otra ruta (/producto/X): isHome era false y
    // el scroll nunca corria, dejando al usuario arriba en el hero sin ver
    // los productos filtrados.
    const goesToHome = cat.path === '/' || cat.path.startsWith('/?');
    if (goesToHome) {
      // Scroll robusto al catalogo. Problema sutil: el navbar es sticky y se
      // contrae al hacer scroll (Dynamic Island), lo cual cambia la altura
      // del documento durante el scroll smooth y deja el destino mal alineado.
      // Solucion: usar rAF anidados para esperar al render post-navigate, y
      // calcular la posicion final manualmente con la altura del navbar
      // contraido (74px isla + ~22px margen) ya considerada.
      const scrollToCatalog = () => {
        const el = document.getElementById('tienda');
        if (!el) return;
        // Si estamos arriba (<60px), el navbar va a contraerse ~50px durante
        // el scroll y la pagina "sube" esos 50px. Compensamos sumando ese
        // delta al offset para que el destino termine en el lugar correcto.
        const isNavExpanded = window.scrollY < 60;
        const offset = isNavExpanded ? 146 : 96;
        const targetY = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      };
      setTimeout(() => requestAnimationFrame(scrollToCatalog), 220);
    }
  };

  if (mobile) {
    return (
      <button onClick={handleClick}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-medium transition-colors group ${
          cat.highlight ? 'text-rose-600 bg-rose-50' : 'text-ink-700 hover:bg-cream-100 hover:text-rose-600'
        }`}>
        <span className="font-display text-lg">{cat.label}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-ink-300 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-transform">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    );
  }

  if (cat.highlight) {
    return (
      <button onClick={handleClick}
        className="ml-1 px-4 py-1.5 text-[13px] font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-full transition-colors duration-200 whitespace-nowrap shadow-btn">
        {cat.label}
      </button>
    );
  }

  return (
    <button onClick={handleClick}
      className="relative px-3.5 py-1.5 text-[13px] font-medium text-ink-600 hover:text-rose-600 transition-colors duration-200 whitespace-nowrap after:absolute after:left-3.5 after:right-3.5 after:-bottom-0.5 after:h-px after:bg-rose-400 after:origin-left after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300">
      {cat.label}
    </button>
  );
}

export default function Navbar() {
  const { count, openCart } = useCart();
  const { count: favCount } = useWishlist();
  const [ann, setAnn]           = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Dynamic Island: expandida por default (categorias visibles para que el
  // usuario las descubra al entrar) y se contrae al scrollear hacia abajo.
  // Al volver arriba se re-expande sola. En mobile no aplica (sigue el drawer).
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const searchRef  = useRef(null);
  const desktopRef = useRef(null);
  const navigate   = useNavigate();
  const USE_API    = import.meta.env.VITE_API_URL;

  // Announcement ticker — pausa al hover para que el usuario alcance a leer
  const [annPaused, setAnnPaused] = useState(false);
  useEffect(() => {
    if (annPaused) return undefined;
    const t = setInterval(() => setAnn((a) => (a + 1) % ANNOUNCEMENTS.length), 3500);
    return () => clearInterval(t);
  }, [annPaused]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Focus search
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  // Escuchar el evento del BottomNav para abrir el buscador desde mobile
  useEffect(() => {
    const fn = () => setSearchOpen(true);
    window.addEventListener('bcf:open-search', fn);
    return () => window.removeEventListener('bcf:open-search', fn);
  }, []);

  // Debounced live suggestions
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) { setSuggestions([]); setShowSugg(false); return; }
    const t = setTimeout(async () => {
      try {
        let results = [];
        if (USE_API) {
          const { data } = await api.get('/products', { params: { q: query.trim(), limit: 6 } });
          results = (data.products || []).map((p) => ({
            ...p,
            img: p.images?.[0] || p.img || '',
          }));
        } else {
          const { PRODUCTS } = await import('../../data/products');
          results = PRODUCTS.filter((p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            (p.brand || '').toLowerCase().includes(query.toLowerCase())
          ).slice(0, 6);
        }
        setSuggestions(results);
        setShowSugg(true);
      } catch { setSuggestions([]); }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const fn = (e) => { if (desktopRef.current && !desktopRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      trackSearch(query.trim());
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
      setShowSugg(false);
      setSuggestions([]);
      setTimeout(() => {
        document.getElementById('tienda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSugg(false);
    const params = new URLSearchParams(window.location.search);
    if (params.has('q')) {
      params.delete('q');
      const qs = params.toString();
      navigate(qs ? `/?${qs}` : '/');
    }
  };

  const pickSuggestion = (slug) => {
    navigate(`/producto/${slug}`);
    setQuery('');
    setShowSugg(false);
    setSuggestions([]);
    setSearchOpen(false);
  };

  return (
    <>
      {/* ── Announcement strip ── */}
      <div
        className="text-white text-[11px] font-semibold h-8 flex items-center justify-center overflow-hidden relative z-50 cursor-default select-none"
        style={{ background: 'linear-gradient(90deg, #B25577 0%, #CE6C8D 50%, #B25577 100%)' }}
        onMouseEnter={() => setAnnPaused(true)}
        onMouseLeave={() => setAnnPaused(false)}
        onTouchStart={() => setAnnPaused(true)}
        onTouchEnd={() => setAnnPaused(false)}>
        <AnimatePresence mode="wait">
          <motion.span key={ann}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            exit={{    y: -10, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute tracking-[0.18em] uppercase">
            {ANNOUNCEMENTS[ann]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* ── Main nav — glass sticky bar over the warm base ── */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-cream-50/90 backdrop-blur-xl shadow-soft border-b border-cream-200' : 'bg-cream-50/70 backdrop-blur-md border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center gap-2 sm:gap-3">

          {/* Mobile: hamburger */}
          <button onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="lg:hidden p-2 -ml-1 text-ink-700 hover:text-rose-500 transition-colors flex-shrink-0">
            <MenuIcon />
          </button>

          {/* Logo — centered on mobile via flex-1 trick */}
          <Link to="/" aria-label="Be Curly Full CR"
            className="flex-shrink-0 lg:flex-none absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
            <img src="/icons/logo.jpg" alt="Be Curly Full CR" className="h-9 sm:h-10 w-auto rounded-xl shadow-soft ring-1 ring-white/60" />
          </Link>

          {/* Desktop: categories centered */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {CATEGORIES.map((c) => <NavCatLink key={c.label} cat={c} />)}
          </nav>

          {/* Spacer mobile to push icons right */}
          <div className="flex-1 lg:hidden" />

          {/* Right icons */}
          <div className="flex items-center gap-0.5 lg:ml-0">

            {/* Desktop search */}
            <div ref={desktopRef} className="hidden lg:block relative mr-1">
              <form onSubmit={handleSearch}
                className="flex items-center gap-2 border border-cream-200 rounded-full px-4 py-2 hover:border-rose-300 focus-within:border-rose-400 focus-within:shadow-[0_0_0_3px_rgba(206,108,141,0.14)] transition-all bg-white/80">
                <SearchIcon />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSugg(true)}
                  placeholder="Buscar..."
                  className="w-36 xl:w-48 text-sm text-ink-900 placeholder-ink-300 outline-none bg-transparent"
                />
                {query && (
                  <button type="button" onClick={clearSearch}
                    className="text-ink-300 hover:text-ink-600 transition-colors text-base leading-none">×</button>
                )}
              </form>
              <AnimatePresence>
                {showSugg && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-modal border border-rose-100 overflow-hidden z-50 min-w-[300px]">
                    {suggestions.map((p) => (
                      <button key={p._id || p.id || p.slug} type="button"
                        onClick={() => pickSuggestion(p.slug)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 transition-colors text-left group">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-rose-50 flex-shrink-0">
                          {p.img ? <img src={p.img} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-rose-100" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink-900 truncate group-hover:text-rose-500 transition-colors">{p.name}</p>
                          <p className="text-xs text-ink-400">{p.brand}</p>
                        </div>
                        <span className="text-sm font-bold text-rose-500 flex-shrink-0">{formatCRC(p.price)}</span>
                      </button>
                    ))}
                    <button type="button" onClick={handleSearch}
                      className="w-full flex items-center justify-center gap-2 py-3 border-t border-rose-50 text-sm text-rose-500 hover:bg-rose-50 font-semibold transition-colors">
                      <SearchIcon /> Ver todos los resultados
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile search */}
            <button onClick={() => setSearchOpen(true)}
              aria-label="Buscar"
              className="lg:hidden p-2 text-ink-600 hover:text-rose-500 transition-colors">
              <SearchIcon />
            </button>

            {/* WA — desktop only */}
            <a href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
              className="hidden xl:flex items-center gap-1.5 text-[11px] font-bold text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-full transition-colors ml-1">
              <WaIcon /> 7212-5261
            </a>

            <UserButton />

            <Link to="/favoritos" aria-label="Favoritos"
              className="relative p-2 text-ink-600 hover:text-rose-500 transition-colors">
              <HeartNavIcon />
              <AnimatePresence>
                {favCount > 0 && (
                  <motion.span key="fav-badge"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {favCount > 9 ? '9+' : favCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            <button onClick={openCart}
              id="cart-fly-target"
              aria-label="Carrito"
              className="relative p-2 text-ink-600 hover:text-rose-500 transition-colors">
              <CartIcon />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span key="badge"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {/* key={count} re-dispara el pop en cada producto agregado */}
                    <motion.span key={count} initial={{ scale: 1.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
                      {count > 9 ? '9+' : count}
                    </motion.span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)} />
            <motion.aside key="drawer"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 h-full z-50 bg-white shadow-modal flex flex-col" style={{ width: 'min(18rem, 85vw)' }}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
                <img src="/icons/logo.jpg" alt="Be Curly Full CR" className="h-9 w-auto rounded-lg" />
                <button onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" className="p-2 text-ink-400 hover:text-ink-900 transition-colors">
                  <CloseIcon />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {CATEGORIES.map((c, i) => (
                  <motion.div key={c.label}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}>
                    <NavCatLink cat={c} onNavigate={() => setMenuOpen(false)} mobile />
                  </motion.div>
                ))}
              </nav>
              <div className="p-6 border-t border-cream-200">
                <a href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors">
                  <WaIcon /> WhatsApp 7212-5261
                </a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Search overlay mobile ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div key="search"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-ink-900/50 backdrop-blur-sm"
            onClick={() => { setSearchOpen(false); setShowSugg(false); }}>
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg">
              <form onSubmit={handleSearch}
                className="bg-white rounded-2xl shadow-modal flex items-center px-5 py-4 gap-3">
                <SearchIcon />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos, marcas..."
                  className="flex-1 text-base text-ink-900 placeholder-ink-300 outline-none" />
                <button type="button" onClick={() => { setSearchOpen(false); setShowSugg(false); }} className="text-ink-300 hover:text-ink-700"><CloseIcon /></button>
              </form>

              {/* Mobile suggestions */}
              <AnimatePresence>
                {showSugg && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-2 bg-white rounded-2xl shadow-modal border border-cream-100 overflow-hidden">
                    {suggestions.map((p) => (
                      <button key={p._id || p.id || p.slug} type="button"
                        onClick={() => pickSuggestion(p.slug)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream-50 transition-colors text-left">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-cream-100 flex-shrink-0">
                          {p.img
                            ? <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-cream-200" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                          <p className="text-xs text-ink-400">{p.brand || 'Be Curly Full CR'}</p>
                        </div>
                        <span className="text-sm font-bold text-ink-900 flex-shrink-0">{formatCRC(p.price)}</span>
                      </button>
                    ))}
                    <button type="button" onClick={handleSearch}
                      className="w-full flex items-center justify-center gap-2 py-3 border-t border-cream-100 text-sm text-rose-500 hover:bg-rose-50 font-medium transition-colors">
                      <SearchIcon /> Ver todos los resultados
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
