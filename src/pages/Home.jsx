import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import ProductCard from '../components/ui/ProductCard';
import FilterBar from '../components/ui/FilterBar';
import { useProducts, useFeatured } from '../hooks/useProducts';
import useGoogleReviews from '../hooks/useGoogleReviews';
import SEO from '../components/ui/SEO';
import api, { assetUrl } from '../lib/api';
import KitBuilder from '../components/ui/KitBuilder';
import { formatCRC } from '../lib/currency';

const USE_API = import.meta.env.VITE_API_URL;

/* ─── Slide config ─── */
/* Si querés usar fotos custom, ponelas en /public/imgs/hero/ y cambiá las urls de abajo */
const SLIDE_CONFIG = [
  {
    eyebrow: 'Felicidad en tus rizos',
    title:   'Amá tus\nrizos hoy',
    sub:     'Productos Be Curlyful para cabello rizado. Envíos a todo Costa Rica.',
    cta:     'Ver catálogo',
    cat:     null,
    img:     '/imgs/productos/Travel KIT.jpg',
    fallback: '/imgs/productos/Travel KIT.jpg',
    objectPosition: 'center 40%',
  },
  {
    eyebrow: 'Rizos definidos',
    title:   'Definí y\nbrillarás',
    sub:     'Activadores, cremas y geles para rizos perfectos sin frizz.',
    cta:     'Ver rizos',
    cat:     'rizos',
    img:     '/imgs/productos/Activador de Rizos.jpg',
    fallback: '/imgs/productos/Activador de Rizos.jpg',
    objectPosition: 'center 30%',
  },
  {
    eyebrow: 'Línea Kids',
    title:   'También\npara ellos',
    sub:     'Be Curlyful Kids: cuidado capilar delicado para los rizos de tus peques.',
    cta:     'Ver Kids',
    cat:     'kids',
    img:     '/imgs/productos/Shampoo KIDS.jpg',
    fallback: '/imgs/productos/Shampoo KIDS.jpg',
    objectPosition: 'center 30%',
  },
];

const ChevronIcon = ({ dir }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'left' ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
  </svg>
);

const TrustTruckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
    <path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
    <circle cx="17" cy="18" r="2"/>
    <circle cx="7" cy="18" r="2"/>
  </svg>
);
const TrustShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);
const TrustChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const TrustCardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);

const TRUST = [
  { Icon: TrustTruckIcon,  title: 'Envío a todo CR',      sub: 'Correos · Express' },
  { Icon: TrustShieldIcon, title: 'Marca propia',          sub: 'Be Curlyful original' },
  { Icon: TrustChatIcon,   title: 'Atención WhatsApp',     sub: 'Respuesta rápida' },
  { Icon: TrustCardIcon,   title: 'SINPE · Transferencia', sub: 'Pago seguro' },
];

const MARQUEE_BRANDS = [
  'Be Curlyful','Activador de Rizos','Crema Gel','Mascarilla Hidro-Nutritiva',
  'Be Curlyful Kids','Shampoo Limpieza Profunda','Travel KIT','Crema Hidratante',
  'Gel Alta Fijación','Acondicionador Revitalizante','Be Curlyful','Shampoo KIDS',
];

/* ─── Icons ─── */
const WaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);


const BoxIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>;
const ZapIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const HandshakeIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/><path d="m9 12 2 2 4-4"/></svg>;

/* ─── Animated count-up (for hero, starts on mount) ─── */
function CountNum({ to, duration = 1.8, delay = 0.5 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  useEffect(() => {
    const ctrl = animate(count, to, { duration, ease: 'easeOut', delay });
    return ctrl.stop;
  }, [to]);
  return <motion.span>{rounded}</motion.span>;
}

/* ─── Count-up triggered when scrolled into view ─── */
function CountNumView({ to, duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(count, to, { duration, ease: 'easeOut' });
    return ctrl.stop;
  }, [inView]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/* ─── Sparkle particles (imagen side) ─── */
const SPARKLES = [
  { x:'8%',  y:'75%', s:4, d:'0s',   t:'3.3s' },
  { x:'18%', y:'55%', s:3, d:'0.9s', t:'2.8s' },
  { x:'30%', y:'80%', s:5, d:'1.5s', t:'3.7s' },
  { x:'48%', y:'65%', s:3, d:'0.3s', t:'2.6s' },
  { x:'60%', y:'78%', s:4, d:'2.0s', t:'3.2s' },
  { x:'72%', y:'50%', s:3, d:'1.1s', t:'2.9s' },
  { x:'82%', y:'72%', s:4, d:'0.6s', t:'3.5s' },
  { x:'90%', y:'40%', s:3, d:'1.8s', t:'2.7s' },
];

function SparkleLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {SPARKLES.map((s, i) => (
        <div key={i} className="absolute rounded-full bg-white/70"
          style={{ left:s.x, top:s.y, width:s.s, height:s.s,
            animationName:'sparkle-float', animationDuration:s.t,
            animationDelay:s.d, animationTimingFunction:'ease-out',
            animationIterationCount:'infinite' }} />
      ))}
      {[{ x:'20%',y:'28%',t:'4.5s',d:'1.2s' },{ x:'65%',y:'22%',t:'5.0s',d:'2.6s' }].map((s,i)=>(
        <div key={`st-${i}`} className="absolute text-white/50 text-xs select-none"
          style={{ left:s.x, top:s.y,
            animationName:'sparkle-float', animationDuration:s.t,
            animationDelay:s.d, animationTimingFunction:'ease-out',
            animationIterationCount:'infinite' }}>✦</div>
      ))}
    </div>
  );
}

/* ─── Featured product card for hero showcase ─── */
function ShowcaseCard({ product, size = 'md', rotate = 0, animDelay = 0 }) {
  if (!product) return null;
  const sizes = {
    lg: 'w-[260px] h-[340px] xl:w-[300px] xl:h-[400px]',
    md: 'w-[150px] h-[180px] xl:w-[170px] xl:h-[210px]',
    sm: 'w-[120px] h-[140px]',
  };
  return (
    <Link to={`/producto/${product.slug}`} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 18, rotate: 0 }}
        animate={{ opacity: 1, y: 0, rotate }}
        transition={{ delay: animDelay, duration: 0.7, ease: [0.3, 1, 0.3, 1] }}
        whileHover={{ y: -8, rotate: 0, scale: 1.02 }}
        className={`${sizes[size]} relative rounded-2xl overflow-hidden bg-white transition-shadow duration-300`}
        style={{
          boxShadow: '0 20px 50px -10px rgba(15,9,11,0.18), 0 6px 18px -8px rgba(232,121,160,0.18)',
        }}>
        {/* Image */}
        {product.img ? (
          <img
            src={assetUrl(product.img)}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-cream-100 flex items-center justify-center text-cream-300">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>
            </svg>
          </div>
        )}

        {/* Gradient bottom overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(15,9,11,0.88) 0%, rgba(15,9,11,0.5) 35%, transparent 100%)' }} />

        {/* Badge — only on lg */}
        {size === 'lg' && product.badge && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-rose-600 text-[10px] font-bold uppercase tracking-widest shadow-sm">
            {product.badge}
          </div>
        )}

        {/* Info overlay */}
        <div className={`absolute inset-x-0 bottom-0 ${size === 'lg' ? 'p-4 xl:p-5' : 'p-3'} text-white`}>
          {product.brand && size !== 'sm' && (
            <p className={`${size === 'lg' ? 'text-[10px]' : 'text-[9px]'} font-bold uppercase tracking-[0.2em] text-white/70 mb-1`}>
              {product.brand}
            </p>
          )}
          <p className={`font-display font-bold leading-tight ${size === 'lg' ? 'text-base xl:text-lg' : 'text-xs'} line-clamp-2 mb-1`}>
            {product.name}
          </p>
          {size === 'lg' && (
            <p className="text-white/90 font-bold text-lg xl:text-xl tabular-nums">{formatCRC(product.price)}</p>
          )}
          {size === 'md' && (
            <p className="text-white/90 font-semibold text-xs tabular-nums">{formatCRC(product.price)}</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Hero Showcase — editorial product mosaic ─── */
function HeroShowcase({ className = '', style }) {
  const products = useFeatured(4);
  const main = products?.[0];
  const sec1 = products?.[1];
  const sec2 = products?.[2];

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Soft pastel gradient background */}
      <div className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FFF0F7 0%, #FEF7F0 45%, #F5EFE8 100%)',
        }} />

      {/* Decorative blurred circles */}
      <div className="absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,121,160,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute -bottom-32 -left-24 w-[380px] h-[380px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.22) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="absolute top-1/2 left-1/3 w-[200px] h-[200px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)', filter: 'blur(30px)' }} />

      {/* Sparkles */}
      <SparkleLayer />

      {/* Content layout */}
      <div className="relative w-full h-full flex items-center justify-center p-6 md:p-8">

        {!main ? (
          <div className="w-[280px] h-[360px] rounded-2xl bg-white/40 backdrop-blur-sm animate-pulse" />
        ) : (
          <>
            {/* Featured (main) — central */}
            <div className="relative z-20">
              <ShowcaseCard product={main} size="lg" rotate={-2} animDelay={0.1} />
            </div>

            {/* Secondary card 1 — top right (desktop only) */}
            {sec1 && (
              <div className="hidden md:block absolute top-[8%] right-[6%] z-10">
                <ShowcaseCard product={sec1} size="md" rotate={5} animDelay={0.3} />
              </div>
            )}

            {/* Secondary card 2 — bottom left (desktop only) */}
            {sec2 && (
              <div className="hidden md:block absolute bottom-[10%] left-[6%] z-10">
                <ShowcaseCard product={sec2} size="md" rotate={-6} animDelay={0.45} />
              </div>
            )}

            {/* "View all" floating chip — desktop bottom right */}
            <Link
              to="/ofertas"
              className="hidden md:flex absolute bottom-6 right-6 z-30 items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-xs transition-all hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(232,121,160,0.2)',
                color: '#E879A0',
                boxShadow: '0 8px 24px -6px rgba(232,121,160,0.2)',
              }}>
              <span>Ver más productos</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Hero wrapper — selects style based on admin settings + localStorage ─── */
function Hero({ onCatSelect }) {
  const [heroStyle, setHeroStyle] = useState(() => {
    try { return localStorage.getItem('heroStyle') || 'grid'; } catch { return 'grid'; }
  });

  useEffect(() => {
    if (!USE_API) return;
    api.get('/settings')
      .then(({ data }) => {
        if (data?.heroStyle) {
          setHeroStyle(data.heroStyle);
          try { localStorage.setItem('heroStyle', data.heroStyle); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  /* React to admin changes in the same tab */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'heroStyle' && e.newValue) setHeroStyle(e.newValue);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (heroStyle === 'video') {
    return <HeroVideoLayout onCatSelect={onCatSelect} />;
  }
  return <HeroGridLayout onCatSelect={onCatSelect} />;
}

/* ─── Hero SPLIT — two-column: text left, product collage right ─── */
function HeroGridLayout({ onCatSelect }) {
  const HERO_PRODUCTS = [
    { slug: 'activador-de-rizos',    img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996541/becurlyfulcr/productos/activador-de-rizos.jpg' },
    { slug: 'mascarilla-hidronutritiva', img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996550/becurlyfulcr/productos/mascarilla-hidronutritiva.jpg' },
    { slug: 'shampoo-kids',          img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996552/becurlyfulcr/productos/shampoo-kids.jpg' },
    { slug: 'travel-kit',            img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996551/becurlyfulcr/productos/travel-kit.jpg' },
  ];

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Pink blob behind right column */}
      <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-bl from-rose-50 via-rose-50/60 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[70vh] sm:min-h-[80vh] lg:min-h-[88vh] py-10 sm:py-14 lg:py-16">

          {/* Left: headline + CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.3, 1, 0.3, 1] }}>
            <span className="section-label">Felicidad en tus rizos ✨</span>
            <h1 className="font-display font-extrabold text-ink-900 leading-[1.05] mb-6"
              style={{ fontSize: 'clamp(2.2rem, 5.5vw, 5rem)' }}>
              Amá tus<br />
              <span className="text-rose-500">rizos</span> hoy
            </h1>
            <p className="text-ink-400 text-lg leading-relaxed mb-10 max-w-md">
              Productos Be Curlyful para cabello rizado. Envíos a todo Costa Rica desde ₡2,000.
            </p>
            <div className="flex flex-wrap gap-4">
              <motion.button
                onClick={() => onCatSelect(null)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn-primary text-base px-8 py-4">
                Ver catálogo
              </motion.button>
              <motion.button
                onClick={() => onCatSelect('kids')}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn-outline text-base px-8 py-4">
                Línea Kids
              </motion.button>
            </div>

            {/* Mobile-only hero image */}
            <div className="lg:hidden mt-8 mx-auto max-w-[260px] sm:max-w-xs">
              <div className="rounded-3xl overflow-hidden aspect-square shadow-[0_16px_48px_rgba(232,121,160,0.25)]">
                <img
                  src="https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996541/becurlyfulcr/productos/activador-de-rizos.jpg"
                  alt="Be Curlyful"
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Trust mini-strip */}
            <div className="mt-8 sm:mt-12 grid grid-cols-2 gap-3 sm:gap-4">
              {TRUST.map((t, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                  className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl flex items-center justify-center text-rose-500 bg-rose-50 flex-shrink-0">
                    <t.Icon />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink-900">{t.title}</p>
                    <p className="text-[10px] text-ink-400">{t.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: staggered product photo grid */}
          <div className="hidden lg:grid grid-cols-2 gap-5 relative">
            {HERO_PRODUCTS.map((p, i) => (
              <motion.div
                key={p.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.12, ease: [0.3, 1, 0.3, 1] }}
                className={i % 2 === 1 ? 'mt-8' : ''}>
                <Link to={`/producto/${p.slug}`}
                  className="block rounded-3xl overflow-hidden aspect-square shadow-[0_8px_32px_rgba(232,121,160,0.18)] hover:shadow-[0_12px_40px_rgba(232,121,160,0.28)] hover:scale-[1.03] transition-all duration-400 group">
                  <img src={p.img} alt="" loading="eager"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </Link>
              </motion.div>
            ))}
            {/* Decorative curly blob */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-rose-100/60 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-4 left-4 w-24 h-24 rounded-full bg-rose-200/40 blur-2xl pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Wave bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full">
          <path d="M0 60 L0 30 Q180 0 360 30 Q540 60 720 30 Q900 0 1080 30 Q1260 60 1440 30 L1440 60 Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

/* ─── Hero video element — robust autoplay (handles bfcache restore, tab visibility) ─── */
function HeroVideo({ className }) {
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const tryPlay = () => {
      // If the resource was discarded (bfcache / tab suspension), force a reload first
      if (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || v.readyState === 0) {
        try { v.load(); } catch {}
      }
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    tryPlay();

    const onVisibility = () => { if (!document.hidden) tryPlay(); };
    const onPageShow = () => tryPlay(); // fires on bfcache restore (event.persisted === true)
    const onCanPlay = () => tryPlay();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('loadeddata', tryPlay);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('loadeddata', tryPlay);
    };
  }, []);

  return (
    <video
      ref={ref}
      src="/videos/hero.mp4"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className={className}
    />
  );
}

/* ─── Hero VIDEO layout — improved ─── */
function HeroVideoLayout({ onCatSelect }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused]   = useState(false);
  const total = SLIDE_CONFIG.length;
  const slide = SLIDE_CONFIG[current];

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % total), 6000);
    return () => clearInterval(t);
  }, [paused, total]);

  const ArrowRight = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );

  return (
    <section className="relative bg-white">

      {/* MOBILE — video on top, text below */}
      <div className="md:hidden relative flex flex-col bg-white">
        <div className="relative w-full overflow-hidden" style={{ height: 'min(58vw, 340px)', minHeight: 280 }}>
          <HeroVideo className="absolute inset-0 w-full h-full object-cover scale-[1.02]" />
          {/* Subtle vignettes */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(15,9,11,0.55) 0%, rgba(15,9,11,0.15) 50%, transparent 100%)' }} />
          {/* Instagram pill */}
          <a href="https://www.instagram.com/becurlyfulcr" target="_blank" rel="noopener noreferrer"
            className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/25"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            <span className="text-white text-[10px] font-bold tracking-wider">@becurlyfulcr</span>
          </a>
        </div>

        <div className="px-6 pt-7 pb-10 bg-white">
          <AnimatePresence mode="wait">
            <motion.div key={`mt-${current}`}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: [0.3,1,0.3,1] }}>

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold tracking-[0.18em] uppercase mb-4 border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                {slide.eyebrow}
              </span>

              <h1 className="font-display font-bold leading-[0.95] text-ink-900 whitespace-pre-line mb-4 tracking-tight"
                style={{ fontSize: 'clamp(2.5rem, 10vw, 3.5rem)' }}>
                {slide.title}
              </h1>

              <p className="text-ink-500 text-[15px] leading-relaxed mb-7 max-w-sm">{slide.sub}</p>

              <div className="flex flex-wrap gap-2.5 mb-7">
                <motion.button onClick={() => onCatSelect(slide.cat)}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2 bg-ink-900 hover:bg-rose-500 text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-300 text-sm shadow-btn">
                  {slide.cta} <ArrowRight />
                </motion.button>
                <a href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-semibold px-6 py-3.5 rounded-full transition-all duration-300 text-sm shadow-btn">
                  <WaIcon /> WhatsApp
                </a>
              </div>

              <div className="flex gap-1.5">
                {SLIDE_CONFIG.map((_, i) => (
                  <button key={i} onClick={() => { setPaused(true); setCurrent(i); }}
                    className={`rounded-full transition-all duration-300 ${i === current ? 'w-7 h-2 bg-ink-900' : 'w-2 h-2 bg-ink-200 hover:bg-ink-400'}`} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* DESKTOP — cinematic full-bleed video with text overlay */}
      <div className="hidden md:block relative overflow-hidden"
        style={{ minHeight: '70vh', maxHeight: '780px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}>

        {/* Full-bleed video background */}
        <HeroVideo className="absolute inset-0 w-full h-full object-cover" />

        {/* Cinematic gradient — dark from left for text contrast */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(15,9,11,0.92) 0%, rgba(15,9,11,0.75) 25%, rgba(15,9,11,0.4) 50%, rgba(15,9,11,0.1) 75%, transparent 100%)' }} />

        {/* Bottom subtle vignette */}
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(15,9,11,0.5), transparent)' }} />

        {/* Brand rose accent */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 5% 50%, rgba(232,121,160,0.25) 0%, transparent 70%)' }} />

        {/* Text content overlay — left aligned */}
        <div className="relative h-full flex items-center" style={{ minHeight: '70vh' }}>
          <div className="max-w-7xl mx-auto w-full px-8 lg:px-12 xl:px-16 py-12">
            <div className="max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div key={current}
                  initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.55, ease: [0.3, 1, 0.3, 1] }}>

                  <motion.span
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-white text-[11px] font-bold tracking-[0.2em] uppercase mb-6 backdrop-blur-md border border-white/25"
                    style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse" />
                    {slide.eyebrow}
                  </motion.span>

                  <motion.h1
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.55, ease: [0.3, 1, 0.3, 1] }}
                    className="font-display font-bold text-white leading-[0.92] mb-6 whitespace-pre-line tracking-tight"
                    style={{ fontSize: 'clamp(3rem, 5.5vw, 5.5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
                    {slide.title}
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.5 }}
                    className="text-white/90 text-base lg:text-lg leading-relaxed mb-9 max-w-md"
                    style={{ textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
                    {slide.sub}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.36, duration: 0.5 }}
                    className="flex flex-wrap gap-3 mb-10">
                    <motion.button
                      onClick={() => onCatSelect(slide.cat)}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 bg-white text-ink-900 hover:bg-rose-500 hover:text-white font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-xl">
                      {slide.cta} <ArrowRight />
                    </motion.button>
                    <a href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-bold px-7 py-4 rounded-full transition-all duration-300 shadow-xl">
                      <WaIcon /> WhatsApp
                    </a>
                  </motion.div>

                  <div className="flex items-center gap-6 mb-8">
                    <div>
                      <p className="text-2xl font-bold text-white leading-none tabular-nums" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                        <CountNum to={1000} duration={1.8} delay={0.6} />+
                      </p>
                      <p className="text-[10px] text-white/70 mt-1 uppercase tracking-widest font-semibold">Clientas felices</p>
                    </div>
                    <div className="w-px h-10 bg-white/30" />
                    <div>
                      <p className="text-2xl font-bold text-white leading-none tabular-nums" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                        <CountNum to={50} duration={1.5} delay={0.7} />+
                      </p>
                      <p className="text-[10px] text-white/70 mt-1 uppercase tracking-widest font-semibold">Marcas originales</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {SLIDE_CONFIG.map((_, i) => (
                      <button key={i} onClick={() => { setPaused(true); setCurrent(i); }}
                        className={`rounded-full transition-all duration-300 ${i === current ? 'w-9 h-2.5 bg-white' : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'}`} />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Instagram pill — bottom right */}
        <a href="https://www.instagram.com/becurlyfulcr" target="_blank" rel="noopener noreferrer"
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md border border-white/30 hover:scale-105 transition-transform"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          <span className="text-white text-[11px] font-bold tracking-wider">@becurlyfulcr</span>
        </a>
      </div>

      {/* Trust strip — same as grid */}
      <div className="relative mt-4 sm:mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-cream-200 rounded-2xl shadow-sm grid grid-cols-2 md:grid-cols-4 divide-y divide-x divide-cream-200 md:divide-y-0">
            {TRUST.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex items-center gap-3 px-4 sm:px-5 py-4 sm:py-5 first:border-l-0">
                <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0 text-rose-500"
                  style={{ background: 'linear-gradient(135deg, #FDF2F4 0%, #FBEAEE 100%)' }}>
                  <t.Icon />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] sm:text-sm font-bold text-ink-900 leading-tight">{t.title}</p>
                  <p className="text-[10px] sm:text-[11px] text-ink-400 leading-tight mt-0.5 truncate">{t.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Social icons ─── */
const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

/* ─── Social bar — Instagram CTA ─── */
function LocationSocialBar() {
  return (
    <section className="relative bg-white py-16 overflow-hidden border-t border-rose-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}>
          <span className="text-5xl sm:text-6xl block mb-4">📱</span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-ink-900 mb-3">
            @<span className="text-rose-500">becurlyfulcr</span>
          </h2>
          <p className="text-ink-400 text-lg mb-8">
            Seguinos en Instagram y Facebook para tips, novedades y promociones exclusivas.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <motion.a
              href="https://www.instagram.com/becurlyfulcr" target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              Instagram
            </motion.a>
            <motion.a
              href="https://www.facebook.com/share/1BzCcTxMcy/" target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 bg-[#1877F2] hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              Facebook
            </motion.a>
            <motion.a
              href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-green-600 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg text-sm">
              <WaIcon /> WhatsApp
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Product image strip — two rows of product photos ─── */
const STRIP_PHOTOS = [
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996541/becurlyfulcr/productos/activador-de-rizos.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996542/becurlyfulcr/productos/crema-gel-rizos.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996543/becurlyfulcr/productos/crema-hidratante-rizos.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996544/becurlyfulcr/productos/gel-alta-fijacion.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996545/becurlyfulcr/productos/gel-alta-fijacion-xl.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996546/becurlyfulcr/productos/shampoo-limpieza-diaria.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996547/becurlyfulcr/productos/shampoo-limpieza-profunda.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996548/becurlyfulcr/productos/acondicionador-revitalizante.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996550/becurlyfulcr/productos/mascarilla-hidronutritiva.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996551/becurlyfulcr/productos/travel-kit.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996552/becurlyfulcr/productos/shampoo-kids.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996554/becurlyfulcr/productos/acondicionador-kids.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996555/becurlyfulcr/productos/crema-peinar-kids.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996556/becurlyfulcr/productos/gel-liquido-kids.jpg',
];

function BrandMarquee() {
  const row1 = [...STRIP_PHOTOS, ...STRIP_PHOTOS];
  const row2 = [...STRIP_PHOTOS].reverse().concat([...STRIP_PHOTOS].reverse());
  return (
    <div className="relative bg-white py-8 overflow-hidden group">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-white to-transparent" />
      <div className="space-y-3">
        <div className="flex gap-3 animate-marquee group-hover:[animation-play-state:paused]">
          {row1.map((url, i) => (
            <div key={i} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
              <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 animate-marquee-reverse group-hover:[animation-play-state:paused]">
          {row2.map((url, i) => (
            <div key={i} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
              <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Stats strip — rose gradient with animated counters ─── */
const StatHeart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const StatSparkle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3M12 18v3M5 12H2M22 12h-3M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05 4.93 4.93"/>
  </svg>
);
const StatPin = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const StatShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

const STATS = [
  { to: 1200, suffix: '+', label: 'Clientas felices',         Icon: StatHeart   },
  { to: 50,   suffix: '+', label: 'Marcas originales',        Icon: StatSparkle },
  { to: 3,    suffix: '',  label: 'Años en Costa Rica',       Icon: StatPin     },
  { to: 100,  suffix: '%', label: 'Originales garantizados',  Icon: StatShield  },
];

const RUTINA_STEPS = [
  { step: 1, emoji: '🚿', label: 'Limpieza', desc: 'Shampoo para rizos', color: 'bg-sky-50 border-sky-100', slug: 'shampoo-limpieza-profunda',
    img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996547/becurlyfulcr/productos/shampoo-limpieza-profunda.jpg' },
  { step: 2, emoji: '💧', label: 'Hidratación', desc: 'Acondicionador revitalizante', color: 'bg-teal-50 border-teal-100', slug: 'acondicionador-revitalizante',
    img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996548/becurlyfulcr/productos/acondicionador-revitalizante.jpg' },
  { step: 3, emoji: '💜', label: 'Tratamiento', desc: 'Mascarilla 1× semana', color: 'bg-violet-50 border-violet-100', slug: 'mascarilla-hidronutritiva',
    img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996550/becurlyfulcr/productos/mascarilla-hidronutritiva.jpg' },
  { step: 4, emoji: '✨', label: 'Estilizado', desc: 'Activador de rizos', color: 'bg-amber-50 border-amber-100', slug: 'activador-de-rizos',
    img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996541/becurlyfulcr/productos/activador-de-rizos.jpg' },
];

function StatsStrip() {
  return (
    <section className="py-14 sm:py-20 bg-white border-t border-rose-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="section-label">La clave de los rizos perfectos</span>
          <h2 className="section-title">Tu rutina Be Curlyful</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RUTINA_STEPS.map((r, i) => (
            <motion.div key={r.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}>
              <Link to={`/producto/${r.slug}`}
                className={`group block ${r.color} border rounded-3xl p-5 hover:shadow-[0_8px_24px_rgba(232,121,160,0.15)] transition-all duration-300 hover:-translate-y-1`}>
                <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-md transition-shadow">
                  <img src={r.img} alt={r.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-bold text-ink-300 tracking-widest uppercase">Paso {r.step}</span>
                  <h3 className="font-display font-extrabold text-ink-900 text-lg mt-0.5">{r.label}</h3>
                  <p className="text-rose-500 text-sm font-semibold mt-1">{r.desc}</p>
                  <span className="text-xl mt-2 block">{r.emoji}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Featured section — horizontal scroll ─── */
function FeaturedSection() {
  const products = useFeatured(8);
  if (!products.length) return null;

  return (
    <section className="py-12 sm:py-16 bg-rose-50 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="px-4 sm:px-6 lg:px-8 flex items-end justify-between mb-7">
          <div>
            <span className="section-label">Top productos</span>
            <h2 className="section-title">Lo más pedido</h2>
          </div>
          <Link to="/" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors">
            Ver todo <span className="text-base">→</span>
          </Link>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4 chips-scroll scroll-smooth">
          {products.map((p, i) => (
            <motion.div key={p.id || p._id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex-shrink-0 w-44 sm:w-52">
              <ProductCard product={p} index={i} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Kids spotlight banner ─── */
const KIDS_IMGS = [
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996552/becurlyfulcr/productos/shampoo-kids.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996554/becurlyfulcr/productos/acondicionador-kids.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996555/becurlyfulcr/productos/crema-peinar-kids.jpg',
  'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996556/becurlyfulcr/productos/gel-liquido-kids.jpg',
];

function PromoBanner() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl"
        style={{ background: 'linear-gradient(135deg, #FFFDE7 0%, #FFF9C4 40%, #FFF0F7 100%)' }}>

        <div className="grid lg:grid-cols-2 gap-8 items-center px-8 sm:px-12 py-10 sm:py-14">
          {/* Text */}
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase text-amber-600 bg-amber-100 px-3 py-1 rounded-full mb-5">
              ✨ Línea infantil
            </span>
            <h3 className="font-display font-extrabold text-ink-900 leading-tight mb-4"
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)' }}>
              Be Curlyful <span className="text-rose-500">Kids</span>
            </h3>
            <p className="text-ink-500 leading-relaxed mb-6 max-w-sm">
              Cuidado capilar delicado para los rizos de tus pequeños. Fórmulas suaves, sin lágrimas y con ingredientes naturales.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/?cat=kids"
                className="btn-primary text-sm px-6 py-3">
                Ver línea Kids →
              </Link>
              <a href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-rose-200 text-ink-900 font-bold px-6 py-3 rounded-2xl text-sm hover:border-rose-400 transition-colors">
                <WaIcon /> Consultar
              </a>
            </div>
          </div>

          {/* Product photos grid */}
          <div className="grid grid-cols-2 gap-3">
            {KIDS_IMGS.map((url, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={`rounded-2xl overflow-hidden aspect-square shadow-md ${i % 2 === 1 ? 'mt-4' : ''}`}>
                <img src={url} alt="Kids" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Guarantee section — 3 promise cards ─── */
const GuarShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);
const GuarRefresh = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const GuarChat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const GUARANTEES = [
  {
    Icon: GuarShield,
    title: 'Originales 100%',
    desc:  'Trabajamos directo con distribuidores oficiales. Cada producto es auténtico o te devolvemos tu dinero.',
  },
  {
    Icon: GuarRefresh,
    title: 'Cambios sin complicaciones',
    desc:  'Si algo no está bien con tu pedido, lo resolvemos. Escríbenos por WhatsApp y coordinamos.',
  },
  {
    Icon: GuarChat,
    title: 'Asesoría personalizada',
    desc:  '¿No sabés qué tono elegir? Te ayudamos. Respondemos rápido y con gusto por WhatsApp.',
  },
];

function GuaranteeSection() {
  return (
    <section className="overflow-hidden" style={{ background: 'linear-gradient(135deg, #C9547E 0%, #E879A0 50%, #F472B6 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {GUARANTEES.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex items-start gap-4 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30">
                <g.Icon />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-lg mb-1">{g.title}</h3>
                <p className="text-white/75 text-sm leading-relaxed">{g.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-cream-100 bg-white">
      <div className="skeleton" style={{ aspectRatio: '1' }} />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-2.5 w-1/3 rounded-full" />
        <div className="skeleton h-3.5 w-full rounded-full" />
        <div className="skeleton h-3.5 w-4/5 rounded-full" />
        <div className="flex gap-1 mt-0.5">
          {[0,0,0,0,0].map((_, i) => (
            <div key={i} className="skeleton w-3 h-3 rounded-sm" />
          ))}
        </div>
        <div className="skeleton h-5 w-2/5 rounded-full mt-1" />
      </div>
    </div>
  );
}

const CATEGORY_CHIPS = [
  { label: 'Todos',       cat: 'todos',       img: '/icons/logo.jpg' },
  { label: 'Rizos',       cat: 'rizos',       img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996541/becurlyfulcr/productos/activador-de-rizos.jpg',       desc: '5 productos'  },
  { label: 'Limpieza',    cat: 'limpieza',    img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996547/becurlyfulcr/productos/shampoo-limpieza-profunda.jpg', desc: '2 productos'  },
  { label: 'Tratamiento', cat: 'tratamiento', img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996550/becurlyfulcr/productos/mascarilla-hidronutritiva.jpg', desc: '2 productos'  },
  { label: 'Kids',        cat: 'kids',        img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996552/becurlyfulcr/productos/shampoo-kids.jpg',              desc: '4 productos'  },
  { label: 'Kits',        cat: 'kits',        img: 'https://res.cloudinary.com/dq4eqkzyn/image/upload/v1779996551/becurlyfulcr/productos/travel-kit.jpg',                desc: '1 kit'        },
];

/* ─── Category Cards — large image cards replacing the old pill chips ─── */
function CategoryChips({ cat: activeCat, onCat }) {
  const cards = CATEGORY_CHIPS.filter(c => c.cat !== 'todos');
  return (
    <>
      {/* Mobile: horizontal scroll con cards cuadradas */}
      <div className="sm:hidden flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 chips-scroll">
        {cards.map((s, i) => {
          const isActive = activeCat === s.cat;
          return (
            <motion.button
              key={s.cat}
              onClick={() => onCat(isActive ? 'todos' : s.cat)}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 w-28 h-28 relative overflow-hidden rounded-2xl flex flex-col items-center justify-end pb-3 transition-all ${
                isActive ? 'ring-3 ring-rose-500 ring-offset-1 shadow-[0_4px_16px_rgba(232,121,160,0.4)]' : 'shadow-md'
              }`}>
              <img src={s.img} alt={s.label} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,5,8,0.8) 0%, transparent 60%)' }} />
              <div className="relative z-10 text-center text-white">
                <p className="font-display font-extrabold text-sm leading-tight">{s.label}</p>
              </div>
              {isActive && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((s, i) => {
          const isActive = activeCat === s.cat;
          return (
            <motion.button
              key={s.cat}
              onClick={() => onCat(isActive ? 'todos' : s.cat)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative overflow-hidden rounded-3xl aspect-square flex flex-col items-center justify-end pb-4 transition-all duration-300 ${
                isActive ? 'ring-4 ring-rose-500 ring-offset-2 shadow-[0_8px_32px_rgba(232,121,160,0.4)]' : 'shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_28px_rgba(232,121,160,0.25)]'
              }`}>
              <img src={s.img} alt={s.label} loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className={`absolute inset-0 transition-opacity duration-300 ${isActive ? 'opacity-80' : 'opacity-60 group-hover:opacity-70'}`}
                style={{ background: 'linear-gradient(to top, rgba(10,5,8,0.85) 0%, rgba(10,5,8,0.2) 60%, transparent 100%)' }} />
              <div className="relative z-10 text-center text-white px-2">
                <p className="font-display font-extrabold text-lg leading-tight">{s.label}</p>
                {s.desc && <p className="text-white/70 text-[11px] mt-0.5">{s.desc}</p>}
              </div>
              {isActive && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

const PAGE_SIZE = 8;

/* ─── Catalog ─── */
function Catalog({ externalCat, catalogRef }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [animKey, setAnimKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const cat      = searchParams.get('cat')      || 'todos';
  const brand    = searchParams.get('brand')    || '';
  const q        = searchParams.get('q')        || '';
  const sort     = searchParams.get('sort')     || 'relevancia';
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : '';
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : '';

  const applyFilter = (updates) => {
    setSearchParams((prev) => {
      const np = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        const isEmpty = !v || v === 'todos' || v === 'relevancia';
        isEmpty ? np.delete(k) : np.set(k, String(v));
      });
      return np;
    });
    setAnimKey((k) => k + 1);
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    if (!externalCat) return;
    applyFilter({ cat: externalCat });
  }, [externalCat]);

  const handleCat   = (c) => applyFilter({ cat: c });
  const handleBrand = (b) => applyFilter({ brand: b });
  const handlePrice = ({ minPrice: mn, maxPrice: mx }) => applyFilter({ minPrice: mn, maxPrice: mx });
  const handleSort  = (s) => applyFilter({ sort: s });

  const { products: rawProducts, loading } = useProducts({ cat, brand, q });
  const filtered = rawProducts.filter((p) =>
    (!minPrice || p.price >= minPrice) && (!maxPrice || p.price <= maxPrice)
  );

  const products = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'precio-asc':  return a.price - b.price;
      case 'precio-desc': return b.price - a.price;
      case 'rating':      return (b.rating || 0) - (a.rating || 0);
      case 'nombre':      return a.name.localeCompare(b.name, 'es');
      default:            return 0;
    }
  });

  const catLabel = {
    todos: 'Todos los productos', rizos: 'Rizos',
    limpieza: 'Limpieza', tratamiento: 'Tratamiento',
    kids: 'Kids', kits: 'Kits',
  }[cat] || cat;

  const visible = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  return (
    <section ref={catalogRef} id="tienda" className="bg-white py-20 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="section-label">Catálogo</span>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="section-title mb-0">
                <AnimatePresence mode="wait">
                  <motion.span key={cat}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
                    className="block">{catLabel}</motion.span>
                </AnimatePresence>
              </h2>
              {cat !== 'todos' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={() => handleCat('todos')}
                  className="text-xs bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white font-semibold px-3 py-1 rounded-full transition-colors mt-1">
                  × Limpiar
                </motion.button>
              )}
            </div>
          </div>
          {q && (
            <div className="flex items-center gap-2">
              <p className="text-ink-500 text-sm">
                Resultados para: <strong className="text-ink-900">"{q}"</strong>
              </p>
              <button
                onClick={() => applyFilter({ q: '' })}
                className="text-xs bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white font-semibold px-3 py-1 rounded-full transition-colors">
                × Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Categorías */}
        <div className="mt-4 mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-ink-900">Categorías</h2>
            {cat !== 'todos' && (
              <button onClick={() => handleCat('todos')}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors">
                Ver todos →
              </button>
            )}
          </div>
          <CategoryChips cat={cat} onCat={handleCat} />
        </div>

        {/* Filtros */}
        <div className="mb-5 bg-white border border-rose-100 rounded-2xl p-3 shadow-sm">
          <FilterBar brand={brand} minPrice={minPrice} maxPrice={maxPrice} sort={sort} onBrand={handleBrand} onPrice={handlePrice} onSort={handleSort} />
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div key="empty"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center py-24">
              <svg className="mx-auto mb-4 text-ink-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <p className="text-ink-400 text-lg font-medium">No encontramos productos con esos filtros.</p>
              <button onClick={() => handleCat('todos')} className="mt-5 text-rose-500 font-semibold hover:underline">
                Ver todos los productos
              </button>
            </motion.div>
          ) : (
            <>
              <motion.div key={`grid-${animKey}`}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.38, ease: [0.3, 1, 0.3, 1] }}
                className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {visible.map((p, i) => <ProductCard key={p.id || p._id} product={p} index={i} />)}
              </motion.div>
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <motion.button
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 border-2 border-rose-400 text-rose-500 hover:bg-rose-500 hover:text-white font-semibold px-8 py-3 rounded-full transition-all duration-300">
                    Ver más productos
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </motion.button>
                </div>
              )}
              {!hasMore && products.length > PAGE_SIZE && (
                <p className="mt-8 text-center text-sm text-ink-400">
                  Mostrando todos los {products.length} productos
                </p>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ─── Testimonials — auto-scroll on desktop, snap-scroll on mobile ─── */
const TESTIMONIALS = [
  { quote: 'El Activador de Rizos es increíble. Mis rizos quedaron definitivos y sin frizz todo el día. ¡Ya no puedo vivir sin él!',   name: 'María F.',     city: 'Heredia',       tag: 'Rizos' },
  { quote: 'La Mascarilla Hidro-Nutritiva transformó mi cabello. Lo uso 1 vez a la semana y la diferencia es total.',                  name: 'Daniela R.',   city: 'San José',      tag: 'Tratamiento' },
  { quote: 'El Shampoo Limpieza Profunda me quitó toda la acumulación. Cabello limpio sin resecarse. 100% recomendado.',               name: 'Andrea S.',    city: 'Liberia',       tag: 'Limpieza' },
  { quote: 'La línea Kids es perfecta para mi hija. El shampoo no lágrimas y la crema de peinar son mis favoritos.',                  name: 'Karen M.',     city: 'Pérez Zeledón', tag: 'Kids' },
  { quote: 'El Travel KIT fue mi salvación de vacaciones. Todo en formato pequeño y de calidad. Llegó rapidísimo.',                    name: 'Valeria C.',   city: 'Costa Rica',    tag: 'Kits' },
  { quote: 'La Crema Gel dejó mis rizos perfectos sin pegajosidad. El olor es delicioso. Ya ordené el doble.',                        name: 'Sofía P.',     city: 'Alajuela',      tag: 'Rizos' },
  { quote: 'Me asesoraron por WhatsApp para mi tipo de rizo. Atención de 10. Los productos llegaron bien empacados y rápido.',         name: 'Natalia B.',   city: 'Cartago',       tag: 'Servicio' },
  { quote: 'El Acondicionador Revitalizante es como un tratamiento. Mi cabello quedó suave y brillante. Lo uso cada lavado.',          name: 'Fiorella G.',  city: 'San Ramón',     tag: 'Tratamiento' },
  { quote: 'Primera compra y ya soy clienta fiel. El Gel Alta Fijación mantiene mis rizos perfectos todo el día sin costra.',          name: 'Stephanie L.', city: 'Guanacaste',    tag: 'Rizos' },
];

function TestimonialCard({ t }) {
  const rating  = t.rating || 5;
  const rounded = Math.round(rating);
  const hasText = Boolean(t.quote && t.quote.trim());

  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(232,121,160,0.1)] border border-rose-50 mb-4 group hover:shadow-[0_8px_32px_rgba(232,121,160,0.18)] transition-all duration-300">
      {/* Stars */}
      <div className="flex gap-0.5 mb-3">
        {[1,2,3,4,5].map(s => (
          <svg key={s} width="14" height="14" viewBox="0 0 24 24"
            fill={s <= rounded ? '#E879A0' : 'none'}
            stroke={s <= rounded ? '#E879A0' : '#F9A8D4'}
            strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        ))}
      </div>

      {hasText ? (
        <p className="text-ink-600 text-sm leading-relaxed mb-4 line-clamp-4">"{t.quote}"</p>
      ) : (
        <div className="mb-4 flex items-center gap-2 py-1">
          <span className="text-2xl font-display font-extrabold text-rose-500">{rating.toFixed(1)}</span>
          <span className="text-xs text-ink-400">Calificación perfecta</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-3 border-t border-rose-50">
        {t.avatar ? (
          <img src={t.avatar} alt={t.name} referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-extrabold flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #E879A0, #F472B6)' }}>
            {t.name?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-900 truncate">{t.name}</p>
          <p className="text-[11px] text-ink-400 truncate">{t.city}</p>
        </div>
        {t.tag && (
          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full flex-shrink-0 border border-rose-100">{t.tag}</span>
        )}
      </div>
    </div>
  );
}

function ScrollColumn({ items, direction = 'up', durationSecs = 34 }) {
  const ref = useRef(null);
  const doubled = [...items, ...items];
  const pause  = () => { if (ref.current) ref.current.style.animationPlayState = 'paused'; };
  const resume = () => { if (ref.current) ref.current.style.animationPlayState = 'running'; };

  return (
    <div className="overflow-hidden" style={{ height: '480px' }}>
      <div
        ref={ref}
        onMouseEnter={pause}
        onMouseLeave={resume}
        style={{ animation: `scroll-${direction} ${durationSecs}s linear infinite` }}>
        {doubled.map((t, i) => <TestimonialCard key={i} t={t} />)}
      </div>
    </div>
  );
}

function TestimonialsSection() {
  const { data: googleData } = useGoogleReviews();

  const googleReviews = (googleData?.reviews || []).map((r) => ({
    quote: r.text,
    name: r.author,
    city: r.relativeTime,
    avatar: r.avatar,
    rating: r.rating,
    tag: 'Google',
  }));

  const hasReal = googleReviews.length >= 1;
  const items   = hasReal ? googleReviews : TESTIMONIALS;

  const useScrollColumns = items.length >= 3;

  // Distribute items so each column has at least 1 (cycle small sets)
  const distribute = (offset) => {
    if (items.length === 0) return [];
    const out = [];
    for (let i = 0; i < Math.max(items.length, 3); i++) {
      out.push(items[(i * 3 + offset) % items.length]);
    }
    return out;
  };
  const col1 = distribute(0);
  const col2 = distribute(1);
  const col3 = distribute(2);

  return (
    <section className="bg-white py-16 sm:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-12">
          <span className="section-label">Comunidad Be Curlyful</span>
          <h2 className="section-title">
            {hasReal ? (
              <>Reseñas <span className="text-rose-500">verificadas</span></>
            ) : (
              <>Lo que dicen <span className="text-rose-500">nuestras clientas</span></>
            )}
          </h2>

          {hasReal && googleData?.rating && (
            <a href={googleData.url || '#'} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-white border border-cream-200 hover:border-rose-200 transition-colors shadow-sm">
              <span className="text-rose-400 tracking-wider">{'★'.repeat(Math.round(googleData.rating))}</span>
              <span className="text-sm font-bold text-ink-900">{googleData.rating.toFixed(1)}</span>
              <span className="text-xs text-ink-400">· {googleData.total} reseñas en Google</span>
            </a>
          )}

          {!hasReal && (
            <p className="text-ink-500 mt-3 max-w-xl mx-auto text-sm">
              Productos originales, envío rápido y atención cercana.
            </p>
          )}
        </motion.div>

        {/* Mobile: horizontal snap scroll */}
        <div className="sm:hidden overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
          <div className="flex gap-4 w-max pb-2">
            {items.map((t, i) => (
              <div key={i} className="w-[80vw] flex-shrink-0 snap-start">
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: infinite auto-scroll columns (≥6 items) */}
        {useScrollColumns ? (
          <div className="hidden sm:grid sm:grid-cols-3 gap-5">
            <ScrollColumn items={col1} direction="up"   durationSecs={32} />
            <ScrollColumn items={col2} direction="down" durationSecs={28} />
            <ScrollColumn items={col3} direction="up"   durationSecs={38} />
          </div>
        ) : (
          /* Desktop: centered grid when few reviews */
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {items.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}>
                <TestimonialCard t={t} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── About ─── */
function AboutSection() {
  return (
    <section id="nosotras" className="bg-rose-50 py-20 sm:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Logo / visual side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.3, 1, 0.3, 1] }}
            className="flex justify-center lg:justify-start">
            <div className="relative">
              <div className="w-56 h-56 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_16px_40px_rgba(232,121,160,0.25)] sm:shadow-[0_24px_64px_rgba(232,121,160,0.3)]">
                <img src="/icons/logo.jpg" alt="Be Curlyful" className="w-full h-full object-cover" />
              </div>
              {/* Floating badge */}
              <motion.div
                animate={{ y: [-6, 6, -6] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 bg-white rounded-xl sm:rounded-2xl shadow-[0_8px_24px_rgba(232,121,160,0.2)] px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2">
                <span className="text-2xl">💕</span>
                <div>
                  <p className="font-display font-extrabold text-ink-900 text-sm">Be Curlyful</p>
                  <p className="text-rose-500 text-xs font-semibold">Costa Rica</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.3, 1, 0.3, 1], delay: 0.1 }}>
            <span className="section-label">Nuestra historia</span>
            <h2 className="section-title mb-6">
              Especialistas en <span className="text-rose-500">rizos</span> de Costa Rica
            </h2>
            <p className="text-ink-500 leading-relaxed mb-4">
              Somos Be Curlyful, una marca costarricense dedicada al cuidado del cabello rizado. Cada producto de nuestra línea fue formulado pensando en los rizos de nuestra comunidad.
            </p>
            <p className="text-ink-500 leading-relaxed mb-8">
              Enviamos a toda Costa Rica y respondemos rápido por WhatsApp. Felicidad en tus rizos, eso es lo que queremos darte.
            </p>
            <div className="flex flex-wrap gap-4">
              <motion.a
                href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="btn-primary">
                <WaIcon /> Escríbenos
              </motion.a>
              <motion.a
                href="https://www.instagram.com/becurlyfulcr" target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="btn-outline">
                @becurlyfulcr
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── How it works / Shipping — timeline steps ─── */
const StepBag = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);
const StepCard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);
const StepBox = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>
  </svg>
);

const HOW_STEPS = [
  { num: '01', Icon: StepBag,  title: 'Elegí tu producto', desc: 'Explorá el catálogo y encontrá exactamente lo que querés.' },
  { num: '02', Icon: StepCard, title: 'Pagá con SINPE',    desc: 'Transferencia bancaria o SINPE Móvil. Rápido, fácil y seguro.' },
  { num: '03', Icon: StepBox,  title: 'Recibís en casa',   desc: 'Correos de CR a todo el país, Express Puntarenas o retiro gratis.' },
];

function ShippingSection() {
  const STEPS_VISUAL = [
    { emoji: '🛍️', bg: 'bg-amber-50',  border: 'border-amber-200', title: 'Elegí tu producto', desc: 'Explorá el catálogo y encontrá exactamente lo que querés.' },
    { emoji: '💬', bg: 'bg-green-50',  border: 'border-green-200', title: 'Escribinos por WA', desc: 'Confirmamos disponibilidad y te enviamos los datos de pago.' },
    { emoji: '💸', bg: 'bg-sky-50',    border: 'border-sky-200',   title: 'Pagás con SINPE',   desc: 'Transferencia bancaria o SINPE Móvil. Rápido y seguro.' },
    { emoji: '📦', bg: 'bg-rose-50',   border: 'border-rose-200',  title: 'Recibís en casa',   desc: 'Correos de CR a todo el país o retiro sin costo.' },
  ];
  return (
    <section id="envios" className="bg-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="section-label">Simple y rápido</span>
          <h2 className="section-title">Tu pedido en 4 pasos</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS_VISUAL.map((s, i) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`${s.bg} border ${s.border} rounded-3xl p-6 relative overflow-hidden`}>
              <span className="text-4xl block mb-4">{s.emoji}</span>
              <span className="text-[11px] font-bold text-ink-300 tracking-widest uppercase">Paso {i + 1}</span>
              <h3 className="font-display font-extrabold text-ink-900 text-lg mt-1 mb-2">{s.title}</h3>
              <p className="text-ink-500 text-sm leading-relaxed">{s.desc}</p>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/60 flex items-center justify-center">
                <span className="font-display font-extrabold text-rose-400 text-sm">{i + 1}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.a
            href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg">
            <WaIcon /> Empezar a comprar
          </motion.a>
          <Link to="/?cat=todos" className="text-rose-500 font-semibold text-sm hover:underline">
            Ver todos los productos →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Track Order Section ─── */
function TrackOrderSection() {
  const [num, setNum]   = useState('');
  const navigate        = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = num.trim().toUpperCase();
    if (code) navigate(`/pedido/${code}`);
  };

  return (
    <section className="bg-white py-14 sm:py-20 border-t border-cream-100">
      <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}>
          <span className="inline-flex w-12 h-12 rounded-full bg-rose-50 items-center justify-center text-rose-500 mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>
            </svg>
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 mb-2">¿Ya hiciste un pedido?</h2>
          <p className="text-ink-400 text-sm mb-8">Ingresá tu número de orden para ver el estado en tiempo real.</p>
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
            <input
              value={num}
              onChange={(e) => setNum(e.target.value.toUpperCase())}
              placeholder="BCF-2025-0001"
              className="flex-1 border border-cream-200 rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 transition-colors"
            />
            <motion.button
              type="submit"
              disabled={!num.trim()}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm whitespace-nowrap">
              Rastrear
            </motion.button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
const FAQ_ITEMS = [
  { q: '¿Cuanto demora el envio?', a: 'Por Correos de Costa Rica de 3 a 5 dias habiles. Express en tu zona en 24-48 horas. Coordinas la entrega por WhatsApp.' },
  { q: '¿Como pago?', a: 'Aceptamos SINPE Movil, transferencia bancaria y pago en efectivo en el local. Te enviamos los datos al confirmar tu pedido por WhatsApp.' },
  { q: '¿Los productos son originales?', a: 'Si, todos nuestros productos son 100% originales de marcas autenticas. Trabajamos directamente con distribuidores certificados.' },
  { q: '¿Puedo cambiar o devolver un producto?', a: 'Si el producto llega danado o defectuoso hacemos el cambio sin costo. Escribinos por WhatsApp con fotos del producto y coordinamos.' },
  { q: '¿Hacen envios a todo Costa Rica?', a: 'Si! Enviamos a las 7 provincias por medio de Correos de Costa Rica o servicio express segun tu ubicacion.' },
  { q: '¿Tienen stock o hacen pedidos?', a: 'Manejamos stock disponible para entrega inmediata. Algunos productos se pueden pedir bajo solicitud, consultanos por WhatsApp.' },
];

function FaqSection() {
  const [open, setOpen] = useState(null);
  return (
    <section className="py-16 sm:py-24 bg-rose-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12 items-start">

          {/* Left: header + CTA */}
          <div className="lg:sticky lg:top-24">
            <span className="section-label">FAQ</span>
            <h2 className="section-title mb-4">Preguntas frecuentes</h2>
            <p className="text-ink-500 text-sm leading-relaxed mb-6">
              ¿No encontrás lo que buscás? Escribinos y te respondemos al instante.
            </p>
            <a href="https://wa.me/50672125261" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-3 rounded-2xl transition-colors text-sm">
              <WaIcon /> Preguntar por WA
            </a>
          </div>

          {/* Right: accordion */}
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => setOpen(open === i ? null : i)}
                  className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${open === i ? 'bg-rose-500 text-white' : 'hover:bg-rose-50'}`}>
                  <span className={`font-bold text-sm ${open === i ? 'text-white' : 'text-ink-900'}`}>{item.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={open === i ? 'white' : 'currentColor'}
                    strokeWidth="2.5" className={`flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : 'text-rose-400'}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <p className="px-5 py-4 text-sm text-ink-500 leading-relaxed border-t border-rose-100">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ─── */
export default function Home() {
  const [selectedCat, setSelectedCat] = useState(null);
  const catalogRef    = useRef(null);

  const handleCatSelect = (cat) => {
    setSelectedCat(cat || 'todos');
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  useEffect(() => {
    const fn = (e) => handleCatSelect(e.detail);
    window.addEventListener('bcf:selectcat', fn);
    return () => window.removeEventListener('bcf:selectcat', fn);
  }, []);

  return (
    <main>
      <SEO />
      <Hero onCatSelect={handleCatSelect} />
      <FeaturedSection />
      <KitBuilder />
      <Catalog externalCat={selectedCat} catalogRef={catalogRef} />
      <LocationSocialBar />
      <BrandMarquee />
      <TestimonialsSection />
      <AboutSection />
      <ShippingSection />
      <TrackOrderSection />
      <FaqSection />
    </main>
  );
}
