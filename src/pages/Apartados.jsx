import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/ui/SEO';

const WHATSAPP_URL = 'https://wa.me/50672125261?text=' + encodeURIComponent('Hola, quiero apartar un producto 💕');

const RULES = [
  {
    icon: '💰',
    title: '50% por adelantado',
    body: 'Trabajamos con la mitad del valor total para reservarte el producto. El otro 50% lo cancelás al retirar.',
  },
  {
    icon: '🗓️',
    title: 'Hasta 1 mes',
    body: 'El tiempo máximo de apartado es de un mes desde que confirmamos tu reserva.',
  },
  {
    icon: '🔔',
    title: 'Recordatorio 1–2 días antes',
    body: 'Te escribimos por WhatsApp 1 o 2 días antes de que venza tu apartado para que no se te pase.',
  },
  {
    icon: '💕',
    title: 'Compromiso mutuo',
    body: 'Apreciamos mucho que respetes el plazo. Nos ayuda a tener tu producto reservado y disponible.',
  },
];

const STEPS = [
  { n: 1, title: 'Elegí tu producto', body: 'Buscá lo que querés en la tienda y mandanos un mensaje por WhatsApp con el nombre o foto.' },
  { n: 2, title: 'Pagás el 50%', body: 'Te confirmamos disponibilidad y precio. Pagás la mitad por SINPE Móvil al 7212-5261.' },
  { n: 3, title: 'Reservamos tu producto', body: 'Lo apartamos físicamente con tu nombre por hasta 1 mes.' },
  { n: 4, title: 'Cancelás y retirás', body: 'Cancelás el otro 50% y coordinamos entrega o envío.' },
];

export default function Apartados() {
  return (
    <main className="bg-gradient-to-b from-cream-50 via-white to-cream-50 pt-12 pb-20">
      <SEO
        title="Sistema de apartados"
        description="Apartá tus productos con el 50% del valor por hasta 1 mes. Te ayudamos a reservar lo que querés sin perderlo."
        url="/apartados"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ─── Hero ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.3, 1, 0.3, 1] }}
          className="text-center mb-12">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold tracking-widest uppercase mb-5">
            <span>💗</span>
            <span>Tu producto, reservado</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink-900 leading-tight mb-4">
            Sistema de
            <span className="block italic font-medium" style={{
              background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              apartados
            </span>
          </h1>

          <p className="text-ink-500 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            ¿Te enamoraste de un producto pero no podés llevártelo todavía? Te lo guardamos
            con un 50% de adelanto por hasta 1 mes 💕
          </p>
        </motion.div>

        {/* ─── Rules grid ─── */}
        <div className="grid sm:grid-cols-2 gap-4 mb-14">
          {RULES.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: [0.3, 1, 0.3, 1] }}
              className="bg-white rounded-3xl border border-cream-200 p-6 hover:shadow-card hover:border-rose-200 transition-all">
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">{r.icon}</div>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-900 mb-1.5">{r.title}</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">{r.body}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ─── Steps ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-10 mb-12">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-2">¿Cómo funciona?</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">4 pasos simples</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-display font-bold text-base shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #E879A0 0%, #F472B6 50%, #F472B6 100%)' }}>
                  {s.n}
                </div>
                <div>
                  <h4 className="font-bold text-ink-900 mb-0.5">{s.title}</h4>
                  <p className="text-sm text-ink-500 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ─── CTA card ─── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl p-8 sm:p-12 text-center text-white shadow-modal"
          style={{
            background: 'linear-gradient(135deg, #1A1414 0%, #1A0A12 25%, #831843 55%, #E879A0 85%, #F472B6 100%)',
          }}>
          {/* Sparkle pattern */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><path d='M20 4l1 4 4 1-4 1-1 4-1-4-4-1 4-1z' fill='white' opacity='0.5'/></svg>\")",
              backgroundSize: '120px 120px',
            }}
          />
          <div className="relative">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
              ¿Listo para apartar tu producto?
            </h2>
            <p className="text-white/85 max-w-md mx-auto mb-6 text-sm sm:text-base">
              Escribinos por WhatsApp con el nombre o foto del producto y te confirmamos al toque.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all bg-white text-ink-900 hover:bg-cream-50 shadow-md hover:shadow-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zM6.597 20.193c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                </svg>
                Apartar por WhatsApp
              </a>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all bg-white/10 hover:bg-white/20 text-white border border-white/30">
                Ver productos
              </Link>
            </div>
            <p className="text-white/60 text-xs mt-5">
              También podés llamarnos al <strong className="text-white/90">7212-5261</strong>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
