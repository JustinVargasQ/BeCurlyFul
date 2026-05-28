import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/ui/SEO';

const STEPS = [
  {
    n: '01',
    emoji: '🛍️',
    title: 'Elegís tu producto',
    desc: 'Navegás el catálogo, elegís lo que querés y lo agregás al carrito. Podés agregar varios productos a la vez.',
    color: 'from-rose-50 to-pink-50',
    border: 'border-rose-100',
    dot: 'bg-rose-500',
  },
  {
    n: '02',
    emoji: '📝',
    title: 'Llenás el formulario',
    desc: 'Al ir al carrito llenás tus datos: nombre, WhatsApp, provincia y dirección de entrega. Solo toma un minuto.',
    color: 'from-purple-50 to-violet-50',
    border: 'border-purple-100',
    dot: 'bg-purple-500',
  },
  {
    n: '03',
    emoji: '💬',
    title: 'Confirmás por WhatsApp',
    desc: 'Te abrimos WhatsApp con tu pedido ya listo para enviar. Solo le das clic a "Enviar" y nosotras lo recibimos al instante.',
    color: 'from-green-50 to-emerald-50',
    border: 'border-green-100',
    dot: 'bg-green-500',
  },
  {
    n: '04',
    emoji: '📱',
    title: 'Pagás por SINPE Móvil',
    desc: 'Te enviamos el número de SINPE, hacés el pago desde tu app del banco y nos mandás el comprobante por WhatsApp.',
    color: 'from-blue-50 to-sky-50',
    border: 'border-blue-100',
    dot: 'bg-blue-500',
  },
  {
    n: '05',
    emoji: '📦',
    title: 'Recibís tu pedido',
    desc: 'Coordinamos la entrega por correo o envío a domicilio. Te avisamos cuando tu pedido está en camino.',
    color: 'from-amber-50 to-yellow-50',
    border: 'border-amber-100',
    dot: 'bg-amber-500',
  },
];

const FAQS = [
  {
    q: '¿Cuánto tarda el envío?',
    a: 'Correos de Costa Rica tarda entre 3 y 6 días hábiles a nivel nacional. Puntarenas y zonas cercanas puede ser antes.',
  },
  {
    q: '¿Cuánto cuesta el envío?',
    a: 'El costo de envío varía según tu provincia. Se calcula automáticamente al llenar el formulario. Pedidos grandes pueden tener envío gratis.',
  },
  {
    q: '¿Solo aceptan SINPE?',
    a: 'Sí, actualmente trabajamos con SINPE Móvil. Es el método más seguro y rápido para ambas partes.',
  },
  {
    q: '¿Puedo hacer retiro en tienda?',
    a: 'Sí, podés coordinar retiro en El Roble, Puntarenas. Escribinos por WhatsApp para coordinar.',
  },
  {
    q: '¿Qué pasa si el producto llega dañado?',
    a: 'Si el producto llega en mal estado te lo cambiamos sin costo. Solo necesitamos foto del daño dentro de las 24h de recibido.',
  },
  {
    q: '¿Puedo cancelar mi pedido?',
    a: 'Podés cancelar antes de que procesemos el pedido. Una vez pagado por SINPE, coordinar un reembolso depende del caso.',
  },
];

export default function HowToBuy() {
  return (
    <main className="pt-24 pb-20 bg-white">
      <SEO
        title="¿Cómo comprar?"
        description="Comprá productos para cabello rizado en Be Curly Full CR en 5 pasos simples. Pedidos por WhatsApp y pago por SINPE Móvil. Envíos a todo Costa Rica."
        url="/como-comprar"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14">
          <span className="inline-block text-4xl mb-4">🛒</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            ¿Cómo comprar?
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
            Comprá tus productos favoritos en 5 pasos simples. Sin tarjeta de crédito, todo por WhatsApp y SINPE.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-4 mb-16">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`flex gap-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br ${step.color} border ${step.border}`}>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">
                  {step.emoji}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${step.dot}`} />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Paso {step.n}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-8 text-center text-white mb-16">
          <p className="text-2xl mb-2">¿Lista para comprar?</p>
          <p className="text-white/70 mb-6">Explorá el catálogo y encontrá tus productos favoritos.</p>
          <Link to="/"
            className="inline-flex items-center gap-2 bg-white text-rose-600 font-bold px-6 py-3 rounded-xl hover:bg-rose-50 transition-colors">
            Ver catálogo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </Link>
        </motion.div>

        {/* FAQ */}
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-6 text-center">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.details
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="group bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none font-semibold text-gray-800 text-sm hover:bg-gray-100 transition-colors">
                  {faq.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className="flex-shrink-0 transition-transform group-open:rotate-180 text-gray-400">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </div>
        </div>

        {/* WhatsApp help */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-3">¿Tenés más preguntas?</p>
          <a href="https://wa.me/50672125261?text=Hola! Tengo una consulta sobre cómo comprar."
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-full transition-colors text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
