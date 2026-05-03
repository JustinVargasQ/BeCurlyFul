import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL;

/* Sparkle positions fijas para no recalcular */
const SPARKLES = [
  { x: '12%',  y: '20%', s: 3, d: '0s',   t: '3.1s' },
  { x: '82%',  y: '15%', s: 4, d: '1.2s', t: '2.8s' },
  { x: '65%',  y: '75%', s: 3, d: '0.6s', t: '3.4s' },
  { x: '22%',  y: '70%', s: 4, d: '1.8s', t: '2.9s' },
  { x: '90%',  y: '55%', s: 3, d: '0.4s', t: '3.6s' },
];

export default function ServerWakeup() {
  const [show,    setShow]    = useState(false);
  const [status,  setStatus]  = useState('waking');   // 'waking' | 'ready'
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!API) return;

    let mounted  = true;
    let shown    = false;   // ¿el overlay llegó a mostrarse?

    const showTimer = setTimeout(() => {
      if (!mounted) return;
      shown = true;
      setShow(true);
    }, 1500);

    const elapsedTimer = setInterval(() => {
      if (mounted) setElapsed((e) => e + 1);
    }, 1000);

    const ping = async () => {
      let success = false;
      try {
        const res = await fetch(`${API}/health`, { method: 'GET', signal: AbortSignal.timeout(50000) });
        success = res.ok;
      } catch { /* ignorar — el error se verá en los datos de la tienda */ }

      if (!mounted) return;
      clearTimeout(showTimer);

      /* Avisar a los hooks que ya pueden re-intentar fetch */
      if (success) {
        try { window.dispatchEvent(new CustomEvent('jd:server-ready')); } catch {}
      }

      if (shown) {
        setStatus('ready');
        setTimeout(() => { if (mounted) setShow(false); }, 900);
      }
    };

    ping();

    return () => {
      mounted = false;
      clearTimeout(showTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="wakeup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1A1414 0%, #2A1520 50%, #1A1414 100%)' }}
        >
          {/* Ambient orbs */}
          <div className="pointer-events-none absolute -top-32 -left-20 w-96 h-96 rounded-full blur-3xl animate-orb-pulse"
            style={{ background: 'rgba(184,95,114,0.18)' }} />
          <div className="pointer-events-none absolute -bottom-20 -right-10 w-80 h-80 rounded-full blur-3xl animate-orb-pulse"
            style={{ background: 'rgba(184,95,114,0.12)', animationDelay: '2s' }} />

          {/* Gold top line */}
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent 0%, #C9A875 25%, #B85F72 50%, #C9A875 75%, transparent 100%)' }} />

          {/* Sparkles */}
          {SPARKLES.map((s, i) => (
            <div key={i} className="pointer-events-none absolute rounded-full bg-white/40"
              style={{ left: s.x, top: s.y, width: s.s, height: s.s,
                animationName: 'sparkle-float', animationDuration: s.t,
                animationDelay: s.d, animationTimingFunction: 'ease-out',
                animationIterationCount: 'infinite' }} />
          ))}

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-8">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.3, 1, 0.3, 1] }}
            >
              <p className="font-display text-4xl sm:text-5xl font-bold text-white mb-1 tracking-tight">
                JD <span style={{ color: '#B85F72' }}>Virtual</span>
              </p>
              <p className="font-script text-lg mb-10" style={{ color: 'rgba(201,168,117,0.7)' }}>
                Beauty Store
              </p>
            </motion.div>

            {/* Status */}
            <AnimatePresence mode="wait">
              {status === 'waking' ? (
                <motion.div key="waking"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-5">

                  {/* Pulsing ring */}
                  <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-2 border-rose-500/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-rose-400/50 animate-ping"
                      style={{ animationDelay: '0.3s' }} />
                    <div className="absolute inset-0 rounded-full flex items-center justify-center text-rose-400">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v3M12 18v3M5 12H2M22 12h-3M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05 4.93 4.93"/>
                      </svg>
                    </div>
                  </div>

                  {/* Text */}
                  <div>
                    <p className="text-white font-semibold text-lg mb-1">
                      Encendiendo la tienda
                      <DotDot />
                    </p>
                    <p className="text-white/40 text-sm">
                      {elapsed < 5
                        ? 'Un momento por favor'
                        : elapsed < 15
                        ? `Iniciando servidor · ${elapsed}s`
                        : 'Esto toma unos segundos la primera vez del día'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-48 h-1 rounded-full overflow-hidden bg-white/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #B85F72, #C9A875)' }}
                      initial={{ width: '8%' }}
                      animate={{ width: elapsed >= 20 ? '85%' : `${Math.min(8 + elapsed * 4, 80)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div key="ready"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p className="text-white font-bold text-lg">¡Lista!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom note */}
          <p className="absolute bottom-8 text-white/20 text-xs text-center px-6">
            JD Virtual Store · El Roble, Puntarenas · Costa Rica
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Tres puntos animados */
function DotDot() {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);
  return <span className="inline-block w-5 text-left">{'.'.repeat(dots)}</span>;
}
