import { AnimatePresence, motion } from 'framer-motion';
import useFlyStore from '../../store/flyStore';

/* Renderiza las miniaturas que "vuelan" hacia el ícono del carrito.
 * El destino es el elemento con id="cart-fly-target" (el botón del carrito en
 * el Navbar). Animamos con transform (x/y/scale) para mantener 60fps. */
export default function FlyToCart() {
  const flights = useFlyStore((s) => s.flights);
  const done    = useFlyStore((s) => s.done);

  const targetCenter = () => {
    const el = document.getElementById('cart-fly-target');
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth - 36, y: 56 };
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden>
      <AnimatePresence>
        {flights.map((f) => {
          const to = targetCenter();
          const SIZE = 60;
          return (
            <motion.img
              key={f.id}
              src={f.imageUrl}
              alt=""
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{
                x: to.x - f.from.x,
                y: to.y - f.from.y,
                scale: 0.28,
                opacity: 0.35,
              }}
              transition={{ duration: 0.75, ease: [0.45, 0, 0.25, 1] }}
              onAnimationComplete={() => done(f.id)}
              style={{
                position: 'fixed',
                left: f.from.x - SIZE / 2,
                top: f.from.y - SIZE / 2,
                width: SIZE,
                height: SIZE,
                objectFit: 'cover',
                borderRadius: 16,
                boxShadow: '0 10px 28px rgba(60,30,45,0.28)',
                border: '2px solid #fff',
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
