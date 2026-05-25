import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts } from '../hooks/useProducts';
import { formatCRC } from '../lib/currency';
import ProductCard from '../components/ui/ProductCard';
import SEO from '../components/ui/SEO';

const SORT_OPTIONS = [
  { value: 'descuento',  label: '% Descuento mayor' },
  { value: 'precio-asc', label: 'Precio: menor'     },
  { value: 'precio-desc',label: 'Precio: mayor'     },
  { value: 'ahorro',     label: 'Ahorro en ₡'       },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-cream-100 bg-white">
      <div className="skeleton" style={{ aspectRatio: '1' }} />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-2.5 w-1/3 rounded-full" />
        <div className="skeleton h-3.5 w-full rounded-full" />
        <div className="skeleton h-5 w-2/5 rounded-full mt-1" />
      </div>
    </div>
  );
}

export default function Offers() {
  const { products, loading } = useProducts({ cat: 'todos' });
  const [sort, setSort] = useState('descuento');

  const raw = products.filter((p) => p.oldPrice && p.oldPrice > p.price);

  const offers = [...raw].sort((a, b) => {
    const discA = (1 - a.price / a.oldPrice);
    const discB = (1 - b.price / b.oldPrice);
    const savA  = a.oldPrice - a.price;
    const savB  = b.oldPrice - b.price;
    if (sort === 'descuento')  return discB - discA;
    if (sort === 'precio-asc') return a.price - b.price;
    if (sort === 'precio-desc')return b.price - a.price;
    if (sort === 'ahorro')     return savB - savA;
    return 0;
  });

  const maxDiscount = raw.length
    ? Math.max(...raw.map((p) => Math.round((1 - p.price / p.oldPrice) * 100)))
    : 0;
  const totalSavings = raw.reduce((acc, p) => acc + (p.oldPrice - p.price), 0);

  return (
    <main className="min-h-screen bg-white">
      <SEO
        title="Ofertas y descuentos"
        description="Encontrá las mejores ofertas en maquillaje y skincare originales en Costa Rica. Descuentos reales en marcas auténticas con envíos a todo el país."
        url="/ofertas"
      />

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden pt-24 pb-14"
        style={{ background: 'linear-gradient(135deg, #1A1414 0%, #2E1A20 50%, #1A1414 100%)' }}>

        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-96 h-96 rounded-full bg-rose-500/15 blur-3xl animate-orb-pulse" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-rose-600/10 blur-3xl animate-orb-pulse" style={{ animationDelay: '2s' }} />

        {/* Sparkles */}
        {[{x:'8%',y:'30%',s:3,d:'0.3s',t:'3.2s'},{x:'85%',y:'55%',s:4,d:'1.1s',t:'2.9s'},{x:'50%',y:'75%',s:3,d:'0.7s',t:'3.6s'},{x:'20%',y:'65%',s:4,d:'1.8s',t:'3.0s'}].map((p,i)=>(
          <div key={i} className="pointer-events-none absolute rounded-full bg-white/40"
            style={{left:p.x,top:p.y,width:p.s,height:p.s,
              animationName:'sparkle-float',animationDuration:p.t,animationDelay:p.d,
              animationTimingFunction:'ease-out',animationIterationCount:'infinite'}} />
        ))}

        {/* Gold gradient top line */}
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #C9A875 25%, #B85F72 50%, #C9A875 75%, transparent 100%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/"
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors mb-8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver a la tienda
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.3,1,0.3,1] }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-300"
                  style={{ background: 'rgba(184,95,114,0.25)', border: '1px solid rgba(184,95,114,0.4)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                </div>
                <span className="text-xs font-bold tracking-[0.22em] uppercase text-rose-400">Descuentos activos</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight mb-2">
                Hasta <span className="text-rose-400">−{maxDiscount}%</span> off
              </h1>
              <p className="text-white/50 text-sm">
                {loading ? '...' : `${offers.length} productos · Ahorrás hasta ${formatCRC(Math.max(...raw.map(p=>p.oldPrice-p.price)||[0]))}`}
              </p>
            </motion.div>

            {/* Stats pills */}
            {!loading && offers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.3,1,0.3,1], delay: 0.15 }}
                className="flex gap-3 flex-wrap">
                <div className="rounded-2xl px-4 py-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-2xl font-bold text-white leading-none">{offers.length}</p>
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-0.5">Productos</p>
                </div>
                <div className="rounded-2xl px-4 py-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-2xl font-bold text-rose-400 leading-none">{maxDiscount}%</p>
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-0.5">Máx. descuento</p>
                </div>
                <div className="rounded-2xl px-4 py-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-lg font-bold text-emerald-400 leading-none">{formatCRC(totalSavings)}</p>
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-0.5">Ahorro total</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Sort bar */}
        {!loading && offers.length > 0 && (
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <p className="text-sm text-ink-500">
              <span className="font-semibold text-ink-900">{offers.length}</span> ofertas disponibles
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Ordenar:</span>
              <div className="flex gap-1.5 flex-wrap">
                {SORT_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => setSort(o.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                      sort === o.value
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-rose-50 mx-auto mb-4 flex items-center justify-center text-rose-400">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <p className="text-ink-500 text-lg font-medium mb-2">No hay ofertas activas en este momento.</p>
            <p className="text-ink-400 text-sm mb-6">Volvé pronto — actualizamos descuentos regularmente.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm shadow-btn">
              Ver todos los productos
            </Link>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={sort}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {offers.map((p, i) => <ProductCard key={p.id || p.slug} product={p} index={i} />)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
