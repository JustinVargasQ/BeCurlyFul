import { useRef, useEffect } from 'react';

/* Video vertical estilo reel — autoplay muted en loop, SOLO mientras está
 * visible en pantalla (IntersectionObserver). Ahorra batería/datos en mobile
 * y evita reproducir 4 videos a la vez. El tamaño/recorte lo controla el padre
 * vía className (normalmente object-cover). */
export default function ReelVideo({ src, className = '', poster, eager = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    // Forzar la PROPIEDAD muted (React solo setea el atributo) — sin esto el
    // navegador puede bloquear el autoplay.
    v.muted = true;
    v.defaultMuted = true;

    const tryPlay = () => {
      if (v.readyState === 0) { try { v.load(); } catch {} }
      const p = v.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    if (!('IntersectionObserver' in window)) {
      tryPlay();
      v.addEventListener('canplay', tryPlay);
      return () => v.removeEventListener('canplay', tryPlay);
    }

    let visible = false;
    const onCanPlay = () => { if (visible) tryPlay(); };
    v.addEventListener('canplay', onCanPlay);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (entry.isIntersecting) tryPlay();
        else v.pause?.();
      },
      { threshold: 0.35 }
    );
    io.observe(v);
    return () => { io.disconnect(); v.removeEventListener('canplay', onCanPlay); };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={eager ? 'auto' : 'metadata'}
      aria-hidden="true"
      className={className}
    />
  );
}
