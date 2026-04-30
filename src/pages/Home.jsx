import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import ProductCard from '../components/ui/ProductCard';
import FilterBar from '../components/ui/FilterBar';
import { useProducts, useFeatured, useCategoryPreviews } from '../hooks/useProducts';
import useGoogleReviews from '../hooks/useGoogleReviews';
import SEO from '../components/ui/SEO';
import { assetUrl } from '../lib/api';
import { formatCRC } from '../lib/currency';

/* ─── Slide config ─── */
const SLIDE_CONFIG = [
  {
    eyebrow: 'Nuevos ingresos',
    title:   'Tu nueva\nobsesión',
    sub:     'Maquillaje y skincare de marcas originales con envíos a todo Costa Rica.',
    cta:     'Ver catálogo',
    cat:     null,
    img:     '/imgs/Skincare.jpeg',
  },
  {
    eyebrow: 'Skincare coreano',
    title:   'Cuida tu\npiel hoy',
    sub:     'Productos auténticos con resultados reales para tu rutina diaria.',
    cta:     'Ver skincare',
    cat:     'skincare',
    img:     '/imgs/Skincare.jpeg',
  },
  {
    eyebrow: 'Maquillaje 2025',
    title:   'Brilla con\ntu estilo',
    sub:     'Las marcas que amas al mejor precio en Costa Rica.',
    cta:     'Ver maquillaje',
    cat:     'maquillaje',
    img:     '/imgs/Maquillaje.jpeg',
  },
];

/* ─── Quick categories for hero grid ─── */
const HERO_CATEGORIES = [
  { label: 'Maquillaje', cat: 'maquillaje', img: '/imgs/Maquillaje.jpeg' },
  { label: 'Skincare',   cat: 'skincare',   img: '/imgs/Skincare.jpeg'   },
  { label: 'Cabello',    cat: 'cabello',    img: '/imgs/Cabello.jpeg'    },
  { label: 'Perfumes',   cat: 'perfumes',   img: '/imgs/Perfume.jpeg'    },
];

const ChevronIcon = ({ dir }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'left' ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
  </svg>
);

const CATEGORIES = [
  { label: 'Skin care',  cat: 'skincare',   img: '/imgs/Skincare.jpeg'   },
  { label: 'Maquillaje', cat: 'maquillaje', img: '/imgs/Maquillaje.jpeg' },
  { label: 'Accesorios', cat: 'accesorios', img: '/imgs/Accesorios.jpeg' },
  { label: 'Perfumes',   cat: 'perfumes',   img: '/imgs/Perfume.jpeg'    },
  { label: 'Cabello',    cat: 'cabello',    img: '/imgs/Cabello.jpeg'    },
];

const TRUST = [
  { emoji: '🚚', title: 'Envíos a todo CR',     sub: 'Correos, Uber, Express' },
  { emoji: '✅', title: 'Originales 100%',       sub: 'Marcas auténticas' },
  { emoji: '💬', title: 'Atención WhatsApp',     sub: 'Respuesta rápida' },
  { emoji: '💳', title: 'SINPE / Transferencia', sub: 'Pago seguro' },
];

const MARQUEE_BRANDS = [
  'Beauty Creations','The Ordinary','CeraVe','Italia Deluxe','ELF',
  'Beau Visage','Amor Us','Mixsoon','Ushas','Amuse','Celavi','Kevin y Coco',
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
          boxShadow: '0 20px 50px -10px rgba(15,9,11,0.18), 0 6px 18px -8px rgba(184,95,114,0.18)',
        }}>
        {/* Image */}
        {product.img ? (
          <img
            src={assetUrl(product.img)}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-cream-100 flex items-center justify-center text-3xl">💄</div>
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
          background: 'linear-gradient(135deg, #FBF0F2 0%, #FEF7F0 45%, #F5EFE8 100%)',
        }} />

      {/* Decorative blurred circles */}
      <div className="absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(184,95,114,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute -bottom-32 -left-24 w-[380px] h-[380px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,117,0.22) 0%, transparent 70%)', filter: 'blur(50px)' }} />
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
                border: '1px solid rgba(184,95,114,0.2)',
                color: '#B85F72',
                boxShadow: '0 8px 24px -6px rgba(184,95,114,0.2)',
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

/* ─── Hero — editorial grid: big featured + 4 category cards ─── */
function Hero({ onCatSelect }) {
  const [current, setCurrent] = useState(0);
  const [paused,  setPaused]  = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

          {/* ─── BIG FEATURED CARD (left) — slide carousel ─── */}
          <div className="relative rounded-3xl overflow-hidden bg-cream-100 group"
            style={{ minHeight: '440px', aspectRatio: '1/1.05' }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}>

            {/* Image stack with crossfade — let the photo breathe */}
            <AnimatePresence mode="sync">
              <motion.img
                key={`bg-${current}`}
                src={slide.img}
                alt=""
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.3, 1, 0.3, 1] }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Subtle gradient ONLY at the bottom for text contrast */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(15,9,11,0.65) 0%, rgba(15,9,11,0.2) 50%, transparent 100%)' }} />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-9 lg:p-12 text-white">
              <AnimatePresence mode="wait">
                <motion.div key={current}
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.55, ease: [0.3, 1, 0.3, 1] }}>

                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase mb-4 border border-white/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse" />
                    {slide.eyebrow}
                  </span>

                  <h1 className="font-display font-bold leading-[0.92] whitespace-pre-line mb-4 tracking-tight"
                    style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', textShadow: '0 4px 28px rgba(0,0,0,0.55)' }}>
                    {slide.title}
                  </h1>

                  <p className="text-white text-sm sm:text-base leading-relaxed mb-6 max-w-md"
                    style={{ textShadow: '0 2px 14px rgba(0,0,0,0.5)' }}>
                    {slide.sub}
                  </p>

                  <div className="flex flex-wrap gap-2.5 mb-5">
                    <motion.button
                      onClick={() => onCatSelect(slide.cat)}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.03 }}
                      className="inline-flex items-center gap-2 bg-white text-ink-900 hover:bg-rose-500 hover:text-white font-bold px-7 py-3.5 rounded-full transition-all duration-300 text-sm shadow-lg">
                      {slide.cta} <ArrowRight />
                    </motion.button>
                    <a href="https://wa.me/50688045100" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-bold px-6 py-3.5 rounded-full transition-all duration-300 text-sm shadow-lg">
                      <WaIcon /> WhatsApp
                    </a>
                  </div>

                  {/* Slide dots */}
                  <div className="flex gap-1.5">
                    {SLIDE_CONFIG.map((_, i) => (
                      <button key={i} onClick={() => { setPaused(true); setCurrent(i); }}
                        className={`rounded-full transition-all duration-300 ${i === current ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
                        aria-label={`Slide ${i + 1}`} />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ─── 4 CATEGORY CARDS (right) — 2x2 grid ─── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {HERO_CATEGORIES.map((c, i) => (
              <motion.button
                key={c.cat}
                onClick={() => onCatSelect(c.cat)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: [0.3, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="relative rounded-3xl overflow-hidden bg-cream-100 group text-left"
                style={{ aspectRatio: '1/1', minHeight: '180px' }}>

                {/* Image — protagonist */}
                <img
                  src={c.img}
                  alt={c.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Subtle bottom gradient ONLY for text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(15,9,11,0.55) 0%, rgba(15,9,11,0.1) 60%, transparent 100%)' }} />

                {/* Label only — clean white text with strong shadow */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:p-6 text-white">
                  <p className="font-display font-bold text-xl sm:text-2xl lg:text-3xl leading-tight"
                    style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.4)' }}>
                    {c.label}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ─ TRUST STRIP ─ */}
      <div className="relative mt-3 sm:mt-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl py-4 sm:py-5 px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-3.5 sm:gap-4"
            style={{ background: 'linear-gradient(135deg, #FBF0F2 0%, #FEF7F0 100%)', border: '1px solid rgba(184,95,114,0.12)' }}>
            {TRUST.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex items-center gap-2.5 sm:gap-3">
                <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg bg-white shadow-sm border border-rose-100">
                  {t.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] sm:text-sm font-bold text-ink-900 leading-tight truncate">{t.title}</p>
                  <p className="text-[10px] sm:text-[11px] text-ink-500 leading-tight truncate mt-0.5">{t.sub}</p>
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

/* ─── Location + social bar ─── */
/* Exact coordinates from Google Maps place data */
const GMAPS_KEY      = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const MAP_SRC        = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929!2d-84.7373714!3d9.9831039!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa03154759b38a3%3A0xac4f35b09c9145f1!2sJD%20Virtual%20Store!5e0!3m2!1ses!2scr!4v1713500000000!5m2!1ses!2scr';
const STREET_SRC     = GMAPS_KEY
  ? `https://www.google.com/maps/embed/v1/streetview?key=${GMAPS_KEY}&location=9.9830986,-84.7347965&heading=210&pitch=10&fov=80`
  : 'https://maps.google.com/maps?q=JD+Virtual+Store,+El+Roble,+Puntarenas&layer=c&cbll=9.9830986,-84.7347965&cbp=12,0,0,0,0&output=svembed';
const MAPS_SHARE_URL = 'https://maps.app.goo.gl/6xtpLET4qTGUxvme9';
const STREET_OPEN_URL = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=9.9830986,-84.7347965';

function LocationSocialBar() {
  const [view, setView] = useState('street');

  const SOCIALS = [
    { href: 'https://www.instagram.com/jd_virtual/',                        label: 'Instagram', icon: <InstagramIcon />, color: '#E1306C', bg: 'rgba(225,48,108,0.12)' },
    { href: 'https://www.tiktok.com/@jd_virtual_store',                     label: 'TikTok',    icon: <TikTokIcon />,    color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
    { href: 'https://www.facebook.com/p/JD-Virtual-Store-100057624661917/', label: 'Facebook',  icon: <FacebookIcon />,  color: '#1877F2', bg: 'rgba(24,119,242,0.12)' },
    { href: 'https://wa.me/50688045100',                                    label: 'WhatsApp',  icon: <WaIcon />,        color: '#25D366', bg: 'rgba(37,211,102,0.12)' },
  ];

  return (
    <section className="relative bg-ink-900 overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-rose-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-0 w-64 h-64 rounded-full bg-rose-400/6 blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-10">
          <span className="text-xs font-bold tracking-[0.22em] uppercase text-rose-400 block mb-1">Encuéntranos</span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white leading-tight">
            Visitanos en <span className="text-rose-400">El Roble</span>, Puntarenas
          </h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">

          {/* ── Map card ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.3, 1, 0.3, 1] }}
            className="flex-1 min-w-0 flex flex-col">

            {/* Toggle tabs — pill style */}
            <div className="flex gap-1.5 mb-4 p-1 rounded-full w-fit"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { id: 'street', label: 'Street View', icon: '🚶' },
                { id: 'map',    label: 'Mapa',         icon: '🗺️' },
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  layout
                  className={`relative flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-colors duration-200 ${
                    view === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}>
                  {view === tab.id && (
                    <motion.span
                      layoutId="tab-bg"
                      className="absolute inset-0 rounded-full bg-rose-500"
                      style={{ zIndex: -1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span>{tab.icon}</span>
                  {tab.label}
                </motion.button>
              ))}
            </div>

            {/* Viewer — iframes on desktop, tap-to-open on mobile */}
            <div className="relative rounded-2xl overflow-hidden flex-1 min-h-[360px] sm:min-h-[400px] md:min-h-[280px]"
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.4)' }}>

              {/* Map iframe — works on all sizes */}
              <iframe
                src={MAP_SRC}
                width="100%" height="100%"
                style={{
                  border: 0, position: 'absolute', inset: 0,
                  opacity: view === 'map' ? 1 : 0,
                  pointerEvents: view === 'map' ? 'auto' : 'none',
                  transition: 'opacity 0.35s ease',
                }}
                loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"
                title="JD Virtual Store — mapa"
              />

              {/* Street View iframe — works on all devices with Embed API key, desktop-only with legacy URL */}
              <iframe
                src={STREET_SRC}
                width="100%" height="100%"
                style={{
                  border: 0, position: 'absolute', inset: 0,
                  opacity: view === 'street' ? 1 : 0,
                  pointerEvents: view === 'street' ? 'auto' : 'none',
                  transition: 'opacity 0.35s ease',
                }}
                loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"
                title="JD Virtual Store — Street View"
                className={GMAPS_KEY ? '' : 'hidden md:block'}
              />

              {/* Street View fallback — mobile only when no API key */}
              {!GMAPS_KEY && (
              <a href={STREET_OPEN_URL} target="_blank" rel="noopener noreferrer"
                className="md:hidden absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
                style={{
                  opacity: view === 'street' ? 1 : 0,
                  pointerEvents: view === 'street' ? 'auto' : 'none',
                  transition: 'opacity 0.35s ease',
                  background: 'linear-gradient(135deg, #1A1414 0%, #2E2626 50%, #1A1414 100%)',
                }}>
                <span className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full bg-rose-500/20 blur-3xl" />
                <span className="pointer-events-none absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-rose-400/15 blur-3xl" />

                <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(184,95,114,0.15)', border: '1px solid rgba(184,95,114,0.3)' }}>
                  🚶
                </div>
                <div className="relative z-10">
                  <p className="font-display text-lg font-semibold text-white mb-1">Recorré la calle</p>
                  <p className="text-white/50 text-sm leading-relaxed max-w-xs">
                    Abrí Street View en Google Maps para ver la tienda desde la calle
                  </p>
                </div>
                <span className="relative z-10 inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-btn transition-colors">
                  Abrir Street View
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M17 7H8M17 7V16"/>
                  </svg>
                </span>
              </a>
              )}
            </div>
          </motion.div>

          {/* ── Info card ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.3, 1, 0.3, 1], delay: 0.1 }}
            className="lg:w-64 xl:w-72 flex flex-col gap-5">

            {/* Location card */}
            <div className="rounded-2xl p-5 flex-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-rose-400 mb-4">Ubicación</p>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                  style={{ background: 'rgba(184,95,114,0.18)', border: '1px solid rgba(184,95,114,0.25)' }}>
                  📍
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">El Roble, Puntarenas</p>
                  <p className="text-white/35 text-xs mt-0.5">Costa Rica</p>
                </div>
              </div>

              <div className="h-px bg-white/6 my-4" />

              <a href={MAPS_SHARE_URL} target="_blank" rel="noopener noreferrer"
                className="group flex items-center justify-between w-full text-xs font-semibold text-white/50 hover:text-rose-400 transition-colors duration-200">
                <span>Abrir en Google Maps</span>
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </a>
            </div>

            {/* Socials card */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-rose-400 mb-4">Seguinos en</p>

              <div className="grid grid-cols-4 gap-2">
                {SOCIALS.map((s) => (
                  <motion.a
                    key={s.label}
                    href={s.href}
                    target="_blank" rel="noopener noreferrer"
                    aria-label={s.label}
                    whileHover={{ scale: 1.1, y: -3 }}
                    whileTap={{ scale: 0.93 }}
                    className="flex flex-col items-center gap-1.5 group">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:shadow-lg"
                      style={{ background: s.bg, border: '1px solid rgba(255,255,255,0.08)', color: s.color }}>
                      {s.icon}
                    </div>
                    <span className="text-[9px] text-white/30 group-hover:text-white/60 transition-colors font-medium">
                      {s.label}
                    </span>
                  </motion.a>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Brand marquee — dual rows, opposite directions ─── */
function BrandMarquee() {
  const doubled  = [...MARQUEE_BRANDS, ...MARQUEE_BRANDS];
  const reversed = [...doubled].reverse();
  return (
    <div className="relative bg-ink-900 border-t border-white/5 py-4 overflow-hidden space-y-2.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
        style={{ background: 'linear-gradient(to right, #1A1414, transparent)' }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
        style={{ background: 'linear-gradient(to left, #1A1414, transparent)' }} />
      {/* Row 1 → left to right */}
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((b, i) => (
          <span key={i} className="text-rose-400/70 text-[11px] font-bold uppercase tracking-[0.22em] mx-7 flex-shrink-0">
            {b} <span className="text-rose-600/50 ml-7">✦</span>
          </span>
        ))}
      </div>
      {/* Row 2 → right to left */}
      <div className="flex animate-marquee-reverse whitespace-nowrap">
        {reversed.map((b, i) => (
          <span key={i} className="text-white/22 text-[10px] font-medium uppercase tracking-[0.18em] mx-6 flex-shrink-0">
            {b} <span className="text-white/12 ml-6">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Stats strip — rose gradient with animated counters ─── */
const STATS = [
  { to: 1200, suffix: '+', label: 'Clientas felices',    emoji: '💕' },
  { to: 50,   suffix: '+', label: 'Marcas originales',   emoji: '✨' },
  { to: 3,    suffix: '',  label: 'Años en Costa Rica',  emoji: '🇨🇷' },
  { to: 100,  suffix: '%', label: 'Originales garantizados', emoji: '✅' },
];

function StatsStrip() {
  return (
    <section className="relative py-12 sm:py-16 overflow-hidden">
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #B85F72 0%, #93485A 45%, #C4728A 100%)' }} />
      <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-orb-pulse" />
      <div className="pointer-events-none absolute bottom-0 left-8 w-48 h-48 rounded-full bg-white/8 blur-2xl animate-orb-pulse" style={{ animationDelay: '2s' }} />
      {[{x:'6%',y:'25%',s:4,d:'0.2s',t:'3.1s'},{x:'92%',y:'55%',s:3,d:'1.2s',t:'3.8s'},{x:'48%',y:'78%',s:4,d:'0.7s',t:'2.9s'}].map((p,i)=>(
        <div key={i} className="pointer-events-none absolute rounded-full bg-white/50"
          style={{left:p.x,top:p.y,width:p.s,height:p.s,
            animationName:'sparkle-float',animationDuration:p.t,animationDelay:p.d,
            animationTimingFunction:'ease-out',animationIterationCount:'infinite'}} />
      ))}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
          {STATS.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.3, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="flex flex-col items-center text-center group cursor-default">

              {/* Emoji in glass bubble */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                {s.emoji}
              </div>

              <p className="text-4xl sm:text-5xl font-bold text-white leading-none tabular-nums tracking-tight">
                <CountNumView to={s.to} duration={2} />{s.suffix}
              </p>
              <p className="text-white/60 text-sm mt-2.5 font-medium leading-tight max-w-[120px]">{s.label}</p>

              {/* Subtle bottom accent line */}
              <div className="w-8 h-0.5 mt-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'rgba(255,255,255,0.5)' }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Category cards — premium grid ─── */
function CategoryRow({ onCatSelect }) {
  return (
    <section className="py-16 sm:py-24 bg-cream-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-10 sm:mb-14"
        >
          <span className="section-label">Categorías</span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 leading-tight">
            ¿Qué buscás hoy?
          </h2>
          <div className="h-px w-10 mx-auto mt-3 rounded-full"
            style={{ background: 'linear-gradient(90deg, #C9A875, #B85F72)' }} />
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {CATEGORIES.map((c, i) => (
            <motion.button
              key={c.cat}
              onClick={() => onCatSelect(c.cat)}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.07, duration: 0.55, ease: [0.25, 1, 0.25, 1] }}
              className="group relative overflow-hidden rounded-2xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 text-left"
              style={{ aspectRatio: '3/4' }}
            >
              {/* Image */}
              <img
                src={c.img}
                alt={c.label}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
              />

              {/* Base dark gradient */}
              <div className="absolute inset-0 transition-opacity duration-500"
                style={{ background: 'linear-gradient(to top, rgba(12,8,10,0.9) 0%, rgba(12,8,10,0.18) 55%, rgba(12,8,10,0.04) 100%)' }}
              />

              {/* Hover rose overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                style={{ background: 'linear-gradient(to top, rgba(184,95,114,0.58) 0%, rgba(12,8,10,0.28) 65%, transparent 100%)' }}
              />

              {/* Top accent line — slides in on hover */}
              <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                style={{ background: 'linear-gradient(90deg, #C9A875, #B85F72)' }}
              />

              {/* Label panel */}
              <div className="absolute inset-x-0 bottom-0 p-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-400 ease-out">
                <p className="font-display text-white font-semibold text-sm sm:text-base leading-tight mb-1.5"
                  style={{ textShadow: '0 1px 10px rgba(0,0,0,0.6)' }}>
                  {c.label}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                  <span className="text-[10px] text-white/75 font-medium tracking-widest uppercase">Explorar</span>
                  <span className="text-white/75 text-xs group-hover:translate-x-0.5 transition-transform duration-300">→</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Featured section ─── */
function FeaturedSection() {
  const products = useFeatured(4);
  if (!products.length) return null;

  return (
    <section className="py-14 sm:py-20 bg-cream-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="flex items-end justify-between mb-8">
          <div>
            <span className="section-label">🔥 Tendencias</span>
            <h2 className="section-title animated-underline">Favoritas del momento</h2>
          </div>
          <Link to="/?featured=true"
            className="text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors hidden sm:flex items-center gap-1 group">
            Ver todos
            <span className="group-hover:translate-x-1 transition-transform duration-200 text-base">→</span>
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {products.map((p, i) => (
            <motion.div
              key={p.id || p._id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.3, 1, 0.3, 1] }}>
              <ProductCard product={p} index={i} />
            </motion.div>
          ))}
        </div>

        <div className="mt-6 sm:hidden flex justify-center">
          <Link to="/?featured=true"
            className="text-sm font-semibold text-rose-500 flex items-center gap-1">
            Ver todos los favoritos →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Promo banner — dark editorial ─── */
function PromoBanner() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.3, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-ink-900 px-8 sm:px-14 py-12 sm:py-16 flex flex-col sm:flex-row items-center justify-between gap-6">

        {/* Animated ambient orbs */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full bg-rose-500/22 blur-3xl animate-orb-pulse" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-rose-600/16 blur-2xl animate-orb-pulse" style={{ animationDelay: '2.2s' }} />
        <div className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 w-40 h-40 rounded-full bg-[#C9A875]/10 blur-2xl animate-orb-pulse" style={{ animationDelay: '1.1s' }} />

        {/* Sparkle accents */}
        {[
          { x: '5%', y: '15%', d: '0.4s', t: '4.2s', s: 4 },
          { x: '12%', y: '75%', d: '1.5s', t: '3.6s', s: 3 },
          { x: '88%', y: '20%', d: '0.8s', t: '4.8s', s: 3 },
          { x: '92%', y: '70%', d: '2.2s', t: '3.9s', s: 4 },
        ].map((s, i) => (
          <div key={i}
            className="pointer-events-none absolute rounded-full bg-white/30"
            style={{
              left: s.x, top: s.y,
              width: s.s, height: s.s,
              animationName: 'sparkle-float',
              animationDuration: s.t,
              animationDelay: s.d,
              animationTimingFunction: 'ease-out',
              animationIterationCount: 'infinite',
            }} />
        ))}

        <div className="relative z-10 text-center sm:text-left">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-rose-400 mb-3">Productos 100% originales</p>
          <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white mb-3">
            Las marcas que amas,<br className="hidden sm:block" /> al mejor precio en{' '}
            <span className="text-rose-400">CR</span>
          </h3>
          {/* Payment methods row */}
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            {['SINPE Móvil', 'Transferencia', 'Efectivo'].map((m) => (
              <span key={m} className="text-[11px] font-semibold text-white/60 bg-white/8 border border-white/12 px-2.5 py-1 rounded-full">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex-shrink-0 flex flex-col items-center gap-3">
          <a href="https://wa.me/50688045100" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.04] active:scale-[0.97] text-sm sm:text-base whitespace-nowrap">
            <WaIcon /> Pedir por WhatsApp
          </a>
          <p className="text-white/35 text-xs">Respuesta en minutos</p>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Guarantee section — 3 promise cards ─── */
const GUARANTEES = [
  {
    emoji: '✅',
    title: 'Originales 100%',
    desc:  'Trabajamos directo con distribuidores oficiales. Cada producto es auténtico o te devolvemos tu dinero.',
  },
  {
    emoji: '🔄',
    title: 'Cambios sin complicaciones',
    desc:  'Si algo no está bien con tu pedido, lo resolvemos. Escríbenos por WhatsApp y coordinamos.',
  },
  {
    emoji: '💬',
    title: 'Asesoría personalizada',
    desc:  'No sabés qué tono elegir? Te ayudamos. Respondemos rápido y con gusto por WhatsApp.',
  },
];

function GuaranteeSection() {
  return (
    <section className="bg-white py-14 sm:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10">
          <span className="section-label">Nuestra promesa</span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 leading-tight">
            Comprás con total <em className="text-rose-500 not-italic">confianza</em>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5">
          {GUARANTEES.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.3, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="group relative bg-cream-50 hover:bg-white border border-cream-200 hover:border-rose-200 hover:shadow-card rounded-2xl p-7 transition-all duration-300 text-center">
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, #C9A875, #B85F72)' }} />
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(184,95,114,0.14) 0%, rgba(201,168,117,0.09) 100%)',
                  border: '1px solid rgba(184,95,114,0.22)',
                  boxShadow: '0 4px 16px rgba(184,95,114,0.13)',
                }}
              >
                {g.emoji}
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-900 mb-2 group-hover:text-rose-500 transition-colors duration-300">
                {g.title}
              </h3>
              <p className="text-ink-500 text-sm leading-relaxed">{g.desc}</p>
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

/* ─── Stories row — horizontal scrollable category bubbles ─── */
const STORIES = [
  { label: 'Todos',      cat: 'todos',     emoji: '✨', bg: 'linear-gradient(135deg,#B85F72,#93485A)' },
  { label: 'Skin care',  cat: 'skincare',  img: '/imgs/Skincare.jpeg'   },
  { label: 'Maquillaje', cat: 'maquillaje',img: '/imgs/Maquillaje.jpeg' },
  { label: 'Accesorios', cat: 'accesorios',img: '/imgs/Accesorios.jpeg' },
  { label: 'Perfumes',   cat: 'perfumes',  img: '/imgs/Perfume.jpeg'    },
  { label: 'Cabello',    cat: 'cabello',   img: '/imgs/Cabello.jpeg'    },
];

function StoriesRow({ cat, onCat }) {
  return (
    <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 mb-8 -mx-1 px-1">
      {STORIES.map((s, i) => {
        const isActive = cat === s.cat;
        return (
          <motion.button
            key={s.cat}
            onClick={() => onCat(s.cat)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.3, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-2 flex-shrink-0 group focus:outline-none">

            {/* Circle */}
            <div className={`relative w-[62px] h-[62px] rounded-full p-[2.5px] transition-all duration-300 ${
              isActive
                ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-white shadow-md'
                : 'ring-1 ring-cream-200 hover:ring-rose-300 hover:ring-offset-1 hover:ring-offset-white'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden">
                {s.img ? (
                  <img src={s.img} alt={s.label}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl"
                    style={{ background: s.bg }}>
                    {s.emoji}
                  </div>
                )}
              </div>
            </div>

            {/* Label */}
            <span className={`text-[11px] font-semibold leading-tight transition-colors whitespace-nowrap ${
              isActive ? 'text-rose-500' : 'text-ink-500 group-hover:text-ink-800'
            }`}>
              {s.label}
            </span>
          </motion.button>
        );
      })}
    </div>
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
    todos: 'Todos los productos', ojos: 'Ojos', labios: 'Labios',
    rostro: 'Rostro', skincare: 'Skincare', cabello: 'Cabello',
    maquillaje: 'Maquillaje', accesorios: 'Accesorios', perfumes: 'Perfumes',
  }[cat] || cat;

  const visible = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  return (
    <section ref={catalogRef} id="tienda" className="bg-white py-20">
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

        <StoriesRow cat={cat} onCat={handleCat} />

        <FilterBar brand={brand} minPrice={minPrice} maxPrice={maxPrice} sort={sort} onBrand={handleBrand} onPrice={handlePrice} onSort={handleSort} />

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
  { quote: 'Llegó en 2 días en perfecto estado. La paleta es idéntica a la foto.',     name: 'María F.',     city: 'Heredia',       tag: 'Ojos' },
  { quote: 'Ya es mi tercera compra. Siempre responden rapidísimo por WhatsApp.',      name: 'Daniela R.',   city: 'San José',      tag: 'Skincare' },
  { quote: 'Precios mejores que en el mall y todo original, 100% recomendadas.',        name: 'Andrea S.',    city: 'Liberia',       tag: 'Maquillaje' },
  { quote: 'Me asesoraron por WhatsApp para elegir mi tono de base. Atención de 10.', name: 'Karen M.',     city: 'Pérez Zeledón', tag: 'Rostro' },
  { quote: 'Las retiré en El Roble, súper fácil y super amables.',                      name: 'Valeria C.',   city: 'Puntarenas',    tag: 'Labios' },
  { quote: 'El envío llegó rapidísimo. Todo bien empacado y sellado.',                  name: 'Sofía P.',     city: 'Alajuela',      tag: 'Skincare' },
  { quote: 'Empaque bellísimo, se nota que le ponen amor a cada pedido.',               name: 'Natalia B.',   city: 'Cartago',       tag: 'Maquillaje' },
  { quote: 'Mi paleta favorita. Volveré por más, sin dudarlo.',                          name: 'Fiorella G.',  city: 'San Ramón',     tag: 'Ojos' },
  { quote: 'Envío llegó antes de lo esperado. Recomendadísimas a todas mis amigas.',   name: 'Stephanie L.', city: 'Guanacaste',    tag: 'Skincare' },
];

function TestimonialCard({ t }) {
  const rating  = t.rating || 5;
  const rounded = Math.round(rating);
  const stars   = '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  const hasText = Boolean(t.quote && t.quote.trim());

  return (
    <div className="bg-white rounded-2xl p-5 border border-cream-200 hover:border-rose-200 hover:shadow-card transition-all duration-300 mb-4">
      <div className="text-rose-400 text-sm mb-2.5 tracking-wider">{stars}</div>

      {hasText ? (
        <p className="text-ink-700 text-sm leading-relaxed mb-4 line-clamp-6">"{t.quote}"</p>
      ) : (
        <div className="mb-4 flex items-center gap-2 py-2">
          <span className="text-2xl text-rose-400 leading-none">{rating.toFixed(1)}</span>
          <span className="text-xs text-ink-400 italic">
            {rating >= 5 ? 'Calificación perfecta ✨' : `Calificó con ${rounded} estrellas`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {t.avatar ? (
          <img src={t.avatar} alt={t.name} referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-cream-100" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-500 font-bold flex items-center justify-center text-sm flex-shrink-0">
            {t.name?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-900 truncate">{t.name}</p>
          <p className="text-xs text-ink-400 truncate">{t.city}</p>
        </div>
        {t.tag && (
          <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-1 rounded-full flex-shrink-0">{t.tag}</span>
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
    <section className="bg-cream-50 py-16 sm:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-12">
          <span className="section-label">Lo que dicen nuestras clientas</span>
          <h2 className="section-title">
            {hasReal ? (
              <>
                Reseñas <em className="font-display italic text-rose-500">verificadas</em>
              </>
            ) : (
              <>
                Miles de reseñas,{' '}
                <em className="font-display italic text-rose-500">una sola promesa</em>
              </>
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
    <section id="nosotras" className="bg-ink-900 text-white py-20 sm:py-28 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl animate-orb-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-rose-400/8 blur-3xl animate-orb-pulse" style={{ animationDelay: '3s' }} />

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.3, 1, 0.3, 1] }}>
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-rose-400 mb-4 block">Nosotras</span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-6">
            Tu tienda de <em className="text-rose-400 not-italic">confianza</em> en CR
          </h2>
          <p className="text-white/65 leading-relaxed mb-4 max-w-2xl mx-auto">
            Somos JD Virtual Store, desde El Roble, Puntarenas. Nos especializamos en maquillaje y skincare de marcas auténticas al mejor precio.
          </p>
          <p className="text-white/65 leading-relaxed mb-8 max-w-2xl mx-auto">
            Cada producto es cuidadosamente seleccionado. Atendemos por WhatsApp con respuesta rápida y enviamos a toda Costa Rica.
          </p>
          <motion.a
            href="https://wa.me/50688045100" target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-bold px-8 py-4 rounded-full transition-colors shadow-xl">
            <WaIcon /> Escríbenos
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── How it works / Shipping — timeline steps ─── */
const HOW_STEPS = [
  { num: '01', emoji: '🛍️', title: 'Elegí tu producto', desc: 'Explorá el catálogo y encontrá exactamente lo que querés.' },
  { num: '02', emoji: '💳', title: 'Pagá con SINPE', desc: 'Transferencia bancaria o SINPE Móvil. Rápido, fácil y seguro.' },
  { num: '03', emoji: '📦', title: 'Recibís en casa', desc: 'Correos de CR a todo el país, Express Puntarenas o retiro gratis.' },
];

function ShippingSection() {
  return (
    <section id="envios" className="bg-cream-50 py-16 sm:py-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14 sm:mb-20">
          <span className="section-label">Así de fácil</span>
          <h2 className="section-title">¿Cómo comprar en JD Virtual?</h2>
        </motion.div>

        {/* Steps */}
        <div className="relative grid sm:grid-cols-3 gap-10 sm:gap-6">
          {/* Dashed connector line (desktop only) */}
          <div className="hidden sm:block absolute top-10 left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-px"
            style={{ background: 'repeating-linear-gradient(90deg,#EDB7C1 0,#EDB7C1 8px,transparent 8px,transparent 18px)' }} />

          {HOW_STEPS.map((s, i) => (
            <motion.div key={s.num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: [0.3, 1, 0.3, 1] }}
              className="group relative flex flex-col items-center text-center">

              {/* Icon circle */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: [0, -4, 4, 0] }}
                transition={{ duration: 0.4 }}
                className="relative z-10 w-20 h-20 rounded-full border-2 border-rose-200 group-hover:border-rose-400 bg-white flex flex-col items-center justify-center mb-6 shadow-card group-hover:shadow-btn transition-all duration-300">
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-[9px] font-bold text-rose-400 tracking-[0.18em] mt-0.5">{s.num}</span>
              </motion.div>

              <h3 className="font-display text-lg sm:text-xl font-semibold text-ink-900 mb-2 group-hover:text-rose-500 transition-colors duration-300">{s.title}</h3>
              <p className="text-ink-500 text-sm leading-relaxed max-w-[220px] mx-auto">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.a
            href="https://wa.me/50688045100" target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 bg-ink-900 hover:bg-rose-500 text-white font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-btn hover:shadow-btn-hover">
            <WaIcon /> Empezar a comprar
          </motion.a>
          <p className="text-ink-400 text-sm">o explorá el catálogo de <Link to="/?cat=todos" className="text-rose-500 font-semibold hover:underline">todos los productos</Link></p>
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
          <span className="text-3xl mb-4 block">📦</span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 mb-2">¿Ya hiciste un pedido?</h2>
          <p className="text-ink-400 text-sm mb-8">Ingresá tu número de orden para ver el estado en tiempo real.</p>
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
            <input
              value={num}
              onChange={(e) => setNum(e.target.value.toUpperCase())}
              placeholder="JD-2025-0001"
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
  { q: '¿Cuanto demora el envio?', a: 'Por Correos de Costa Rica de 3 a 5 dias habiles. Express en la zona de Puntarenas en 24-48 horas. Pickup en El Roble coordinas la entrega por WhatsApp.' },
  { q: '¿Como pago?', a: 'Aceptamos SINPE Movil, transferencia bancaria y pago en efectivo en el local. Te enviamos los datos al confirmar tu pedido por WhatsApp.' },
  { q: '¿Los productos son originales?', a: 'Si, todos nuestros productos son 100% originales de marcas autenticas. Trabajamos directamente con distribuidores certificados.' },
  { q: '¿Puedo cambiar o devolver un producto?', a: 'Si el producto llega danado o defectuoso hacemos el cambio sin costo. Escribinos por WhatsApp con fotos del producto y coordinamos.' },
  { q: '¿Hacen envios a todo Costa Rica?', a: 'Si! Enviamos a las 7 provincias por medio de Correos de Costa Rica o servicio express segun tu ubicacion.' },
  { q: '¿Tienen stock o hacen pedidos?', a: 'Manejamos stock disponible para entrega inmediata. Algunos productos se pueden pedir bajo solicitud, consultanos por WhatsApp.' },
];

function FaqSection() {
  const [open, setOpen] = useState(null);
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="section-label">FAQ</span>
          <h2 className="section-title">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border border-cream-200 rounded-2xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-cream-50 transition-colors">
                <span className="font-semibold text-ink-900 text-sm">{item.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`flex-shrink-0 text-rose-400 transition-transform ${open === i ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-ink-500 leading-relaxed border-t border-cream-100 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Floating WhatsApp — with pulse rings ─── */
function FloatingWa() {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="absolute inset-0 rounded-full bg-[#25D366] animate-wa-ring" />
      <div className="absolute inset-0 rounded-full bg-[#25D366] animate-wa-ring" style={{ animationDelay: '1s' }} />
      <motion.a
        href="https://wa.me/50688045100"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        className="relative z-10 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center"
        style={{ boxShadow: '0 6px 28px rgba(37,211,102,0.55)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </motion.a>
    </div>
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
    window.addEventListener('jd:selectcat', fn);
    return () => window.removeEventListener('jd:selectcat', fn);
  }, []);

  return (
    <main>
      <SEO />
      <Hero onCatSelect={handleCatSelect} />
      <CategoryRow onCatSelect={handleCatSelect} />
      <FeaturedSection />
      <Catalog externalCat={selectedCat} catalogRef={catalogRef} />
      <LocationSocialBar />
      <BrandMarquee />
      <TestimonialsSection />
      <AboutSection />
      <ShippingSection />
      <TrackOrderSection />
      <FaqSection />
      <FloatingWa />
    </main>
  );
}
