import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

/* ── Icons ── */
const WaIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

const InstagramIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;

const TikTokIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>;

const FacebookIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/becurlyfulcr',              icon: <InstagramIcon />, color: '#E1306C', bg: 'rgba(225,48,108,0.15)' },
  { label: 'Facebook',  href: 'https://www.facebook.com/share/1BzCcTxMcy/',         icon: <FacebookIcon />,  color: '#1877F2', bg: 'rgba(24,119,242,0.15)'  },
  { label: 'WhatsApp',  href: 'https://wa.me/50672125261',                           icon: <WaIcon />,        color: '#25D366', bg: 'rgba(37,211,102,0.15)'  },
];

const CAT_LINKS = [
  { label: 'Rizos',       cat: 'rizos'       },
  { label: 'Limpieza',    cat: 'limpieza'    },
  { label: 'Tratamiento', cat: 'tratamiento' },
  { label: 'Kids',        cat: 'kids'        },
  { label: 'Kits',        cat: 'kits'        },
];

const PAGE_LINKS = [
  { label: 'Ofertas',         href: '/ofertas'      },
  { label: 'Favoritos',       href: '/favoritos'    },
  { label: 'Apartados',       href: '/apartados'    },
  { label: 'Rastrear pedido', href: '/pedido'       },
  { label: '¿Cómo comprar?',  href: '/como-comprar' },
  { label: 'Privacidad',      href: '/privacidad'   },
];

export default function Footer() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleCatClick = (cat) => {
    if (location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('bcf:selectcat', { detail: cat }));
      document.getElementById('tienda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(`/?cat=${cat}`);
    }
  };

  return (
    <footer className="relative overflow-hidden rounded-t-[2.5rem] sm:rounded-t-[3.5rem] mt-4"
      style={{ background: 'linear-gradient(160deg, #2A181E 0%, #21121A 55%, #1A0E15 100%)', color: '#fff' }}>

      {/* ── Decorative rose glows ── */}
      <div className="pointer-events-none absolute -top-32 -left-20 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(206,108,141,0.22) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute top-10 right-0 w-80 h-80 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(224,168,120,0.14) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 sm:pb-10">

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12">

          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4">
              <img src="/icons/logo.jpg" alt="Be Curly Full CR" className="h-14 w-auto rounded-xl" />
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-xs">
              Productos para cabello rizado y cuidado capilar. Envíos a todo Costa Rica.
            </p>
            <motion.a
              href="https://wa.me/50672125261"
              target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors shadow-lg">
              <WaIcon /> 7212-5261
            </motion.a>
          </div>

          {/* Categories */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/70 mb-5">Categorías</p>
            <ul className="space-y-2.5">
              {CAT_LINKS.map((l) => (
                <li key={l.cat}>
                  <motion.button
                    onClick={() => handleCatClick(l.cat)}
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors group">
                    <span className="w-1 h-1 rounded-full bg-rose-500/0 group-hover:bg-rose-400 transition-all duration-200 flex-shrink-0" />
                    {l.label}
                  </motion.button>
                </li>
              ))}
            </ul>
          </div>

          {/* Pages */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/70 mb-5">Tienda</p>
            <ul className="space-y-2.5">
              {PAGE_LINKS.map((item) => (
                <li key={item.label}>
                  <motion.div whileHover={{ x: 5 }} transition={{ duration: 0.18 }}>
                    <Link to={item.href}
                      className="text-white/50 hover:text-white text-sm transition-colors">
                      {item.label}
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + socials */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/70 mb-5">Contacto</p>
            <ul className="space-y-3 text-sm text-white/50 mb-6">
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 flex-shrink-0"
                  style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.2)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </span>
                WhatsApp 7212-5261
              </li>
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-300 flex-shrink-0"
                  style={{ background: 'rgba(232,121,160,0.15)', border: '1px solid rgba(232,121,160,0.2)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                Costa Rica
              </li>
              <li className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-300 flex-shrink-0"
                  style={{ background: 'rgba(232,121,160,0.15)', border: '1px solid rgba(232,121,160,0.2)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                Lun–Sáb · 9am–7pm
              </li>
            </ul>

            {/* Social icons */}
            <div className="flex gap-2.5 flex-wrap">
              {SOCIALS.map((s) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  target="_blank" rel="noopener noreferrer"
                  aria-label={s.label}
                  whileHover={{ scale: 1.15, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{ background: s.bg, border: '1px solid rgba(255,255,255,0.08)', color: s.color }}>
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs text-white/60 text-center sm:text-left">
            © {new Date().getFullYear()} Be Curly Full CR · Todos los derechos reservados · Costa Rica
          </p>
          <Link to="/admin/login" className="text-white/40 hover:text-white text-xs transition-colors">
            Acceso admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
