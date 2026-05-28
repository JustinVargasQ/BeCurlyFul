import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/ui/SEO';

export default function NotFound() {
  const location = useLocation();

  return (
    <main className="min-h-[80vh] bg-gradient-to-b from-cream-50 to-white pt-12 pb-20 flex items-center">
      <SEO
        title="Página no encontrada"
        description="La página que buscás no existe o fue movida."
        url={location.pathname}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.3, 1, 0.3, 1] }}>
          {/* Number badge */}
          <div className="relative inline-block mb-6">
            <div
              aria-hidden
              className="font-display font-black text-[110px] sm:text-[160px] leading-none tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
              404
            </div>
            <motion.span
              animate={{ rotate: [0, 12, -8, 0], y: [0, -4, 2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-2 -right-6 sm:-right-10 text-3xl sm:text-5xl"
              role="img" aria-label="Brillito">✨</motion.span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 mb-3">
            Esta página se nos perdió
          </h1>
          <p className="text-ink-500 max-w-md mx-auto mb-8 leading-relaxed">
            Quizás cambiamos la URL o el producto ya no está activo. No te preocupes, hay miles
            de cosas lindas para descubrir 💕
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-5 py-2.5 rounded-full transition-colors shadow-btn hover:shadow-btn-hover">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Volver al inicio
            </Link>
            <Link
              to="/ofertas"
              className="inline-flex items-center gap-2 bg-white hover:bg-cream-50 border border-cream-200 hover:border-rose-300 text-ink-700 hover:text-rose-600 font-semibold px-5 py-2.5 rounded-full transition-colors">
              🔥 Ver ofertas
            </Link>
            <Link
              to="/como-comprar"
              className="inline-flex items-center gap-2 bg-white hover:bg-cream-50 border border-cream-200 text-ink-700 font-semibold px-5 py-2.5 rounded-full transition-colors">
              ¿Cómo comprar?
            </Link>
          </div>

          {/* Helpful suggestions */}
          <div className="mt-12 pt-8 border-t border-cream-100">
            <p className="text-xs uppercase tracking-widest text-ink-400 font-bold mb-4">
              ¿Quizás buscabas algo de esto?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'Rizos',       to: '/?cat=rizos'       },
                { label: 'Limpieza',    to: '/?cat=limpieza'    },
                { label: 'Tratamiento', to: '/?cat=tratamiento' },
                { label: 'Kids',        to: '/?cat=kids'        },
                { label: 'Mis favoritos', to: '/favoritos'    },
                { label: 'Rastrear pedido', to: '/pedido'     },
              ].map((c) => (
                <Link key={c.to} to={c.to}
                  className="text-sm px-3.5 py-1.5 rounded-full bg-cream-100 hover:bg-rose-100 text-ink-700 hover:text-rose-700 font-medium transition-colors">
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
