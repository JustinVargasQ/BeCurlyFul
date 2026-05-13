import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/* ── Canvas confetti ──
 * Bug previo en mobile: cuando alive=false, draw() hacia early return sin
 * clearRect → la ultima frame se quedaba "pegada". Ademas el canvas seguia
 * en el DOM consumiendo GPU. Fix:
 *  - clearRect explicito al detener
 *  - Unmount del componente despues de animar (state)
 *  - cancelAnimationFrame en unmount
 *  - Pausar mientras el tab no esta visible (visibilitychange)
 *  - Respetar prefers-reduced-motion */
function Confetti() {
  const canvasRef = useRef(null);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (hidden) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const setSize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    const COLORS = ['#B85F72', '#EDB7C1', '#C9A875', '#f43f5e', '#fbbf24', '#a78bfa', '#34d399', '#fff'];

    // Menos particulas en mobile pequeño para no joder el render
    const isSmall = window.innerWidth < 640;
    const particles = Array.from({ length: isSmall ? 60 : 110 }, (_, i) => ({
      x:         Math.random() * canvas.width,
      y:         -20 - Math.random() * 350,
      w:         Math.random() * 9 + 4,
      h:         Math.random() * 4 + 2,
      color:     COLORS[i % COLORS.length],
      tilt:      Math.random() * 12 - 6,
      tiltSpeed: (Math.random() - 0.5) * 0.18,
      vx:        (Math.random() - 0.5) * 2.5,
      vy:        Math.random() * 2 + 1.5,
      alpha:     1,
    }));

    let alive = true;
    let rafId = null;

    const clearCanvas = () => {
      try { ctx.clearRect(0, 0, canvas.width, canvas.height); } catch {}
    };

    const draw = () => {
      if (!alive) { clearCanvas(); return; }
      clearCanvas();

      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle   = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tilt);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        p.x     += p.vx;
        p.y     += p.vy;
        p.tilt  += p.tiltSpeed;
        p.vy    += 0.045;
        if (p.y > canvas.height * 0.65) p.alpha -= 0.011;
        if (p.y > canvas.height + 20)   { p.y = -20; p.x = Math.random() * canvas.width; p.alpha = 0; }
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    // Pausar mientras la pestaña no esta visible (mobile suele suspender RAF)
    const onVisibility = () => {
      if (document.hidden) {
        alive = false;
        if (rafId) cancelAnimationFrame(rafId);
        clearCanvas();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const stopTimer = setTimeout(() => {
      alive = false;
      if (rafId) cancelAnimationFrame(rafId);
      clearCanvas();
      // Pequena pausa para que clearRect se vea, luego unmount del canvas
      setTimeout(() => setHidden(true), 120);
    }, 4500);

    return () => {
      alive = false;
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(stopTimer);
      clearCanvas();
      window.removeEventListener('resize', setSize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hidden]);

  if (hidden) return null;
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" style={{ opacity: 0.85 }} />;
}

/* ── Animated checkmark SVG ── */
function AnimatedCheck() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.15 }}
      className="relative w-28 h-28 mx-auto mb-8">

      {/* Outer pulse ring */}
      <motion.span
        className="absolute inset-0 rounded-full bg-green-200"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 1.2, delay: 0.5, repeat: 2, ease: 'easeOut' }}
      />

      {/* Circle */}
      <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl">
        <motion.svg
          width="52" height="52" viewBox="0 0 24 24"
          fill="none" stroke="white" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}>
          <motion.polyline
            points="20 6 9 17 4 12"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.3, ease: 'easeOut' }}
          />
        </motion.svg>
      </div>
    </motion.div>
  );
}

/* ── Step item ── */
const StepCheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const StepBoxIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>
  </svg>
);
const StepCardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);
const StepTruckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
    <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
  </svg>
);

const STEPS = [
  { Icon: StepCheckIcon, text: 'Recibimos tu pedido por WhatsApp' },
  { Icon: StepBoxIcon,   text: 'Confirmamos disponibilidad de productos' },
  { Icon: StepCardIcon,  text: 'Te indicamos cómo pagar (SINPE / transferencia)' },
  { Icon: StepTruckIcon, text: 'Coordinamos el envío a tu dirección' },
];

export default function Confirmation() {
  const { state }  = useLocation();
  const orderNumber = state?.orderNumber;

  return (
    <>
      <Confetti />

      <main className="min-h-screen flex items-center justify-center px-4 pt-16 pb-20">
        <div className="w-full max-w-md">

          {/* Check */}
          <AnimatedCheck />

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-center mb-8">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink-900 mb-3 leading-tight">
              ¡Pedido enviado!
            </h1>
            <p className="text-ink-500 leading-relaxed">
              Tu pedido fue enviado por WhatsApp. Te confirmamos los detalles y coordinamos el envío muy pronto.
            </p>
          </motion.div>

          {/* Order number card */}
          {orderNumber && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.65, type: 'spring', stiffness: 200, damping: 20 }}
              className="rounded-2xl p-6 mb-6 text-center"
              style={{
                background: 'linear-gradient(135deg, #fef2f4 0%, #fff5f7 100%)',
                border: '1.5px solid #fecdd3',
              }}>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-rose-400 mb-2">Tu número de pedido</p>
              <p className="font-mono font-extrabold text-rose-600 text-3xl tracking-widest mb-2">{orderNumber}</p>
              <p className="text-xs text-rose-400/80">Guardalo para consultar el estado de tu pedido</p>
            </motion.div>
          )}

          {/* Steps */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.78, duration: 0.45 }}
            className="bg-cream-50 border border-cream-200 rounded-2xl p-5 mb-7">
            <p className="font-semibold text-ink-900 mb-4 text-sm">¿Qué sigue?</p>
            <div className="space-y-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm text-ink-600">
                  <span className="w-7 h-7 rounded-full bg-white border border-cream-200 flex items-center justify-center text-rose-500 flex-shrink-0">
                    <s.Icon />
                  </span>
                  {s.text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="flex flex-col sm:flex-row gap-3">
            <Link to="/"
              className="flex-1 inline-flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-300 text-sm shadow-btn hover:shadow-btn-hover">
              Seguir comprando
            </Link>
            {orderNumber && (
              <Link to={`/pedido/${orderNumber}`}
                className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-cream-200 hover:border-rose-300 text-ink-700 hover:text-rose-500 font-semibold px-6 py-3.5 rounded-xl transition-all duration-300 text-sm">
                Ver estado del pedido
              </Link>
            )}
            <a href="https://wa.me/50688045100" target="_blank" rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-300 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </motion.div>
        </div>
      </main>
    </>
  );
}
