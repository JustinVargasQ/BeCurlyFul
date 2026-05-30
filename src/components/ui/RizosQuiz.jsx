import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCRC } from '../../lib/currency';
import useCart from '../../hooks/useCart';
import useToastStore from '../../store/toastStore';

/* ─── Datos de producto ─── */
const CLD = 'https://res.cloudinary.com/dq4eqkzyn/image/upload';
const PRODS = {
  'activador-de-rizos':        { name: 'Activador de Rizos',           price: 15500, img: `${CLD}/v1779996541/becurlyfulcr/productos/activador-de-rizos.jpg`,        tag: 'Defne & activa' },
  'crema-gel-rizos':           { name: 'Crema Gel para Rizos',         price: 13500, img: `${CLD}/v1779996542/becurlyfulcr/productos/crema-gel-rizos.jpg`,            tag: 'Fijación suave' },
  'crema-hidratante-rizos':    { name: 'Crema Hidratante',             price: 13500, img: `${CLD}/v1779996543/becurlyfulcr/productos/crema-hidratante-rizos.jpg`,     tag: 'Hidratación' },
  'gel-alta-fijacion':         { name: 'Gel Alta Fijación',            price: 10500, img: `${CLD}/v1779996544/becurlyfulcr/productos/gel-alta-fijacion.jpg`,          tag: 'Fijación alta' },
  'gel-alta-fijacion-xl':      { name: 'Gel Alta Fijación XL',         price: 18500, img: `${CLD}/v1779996545/becurlyfulcr/productos/gel-alta-fijacion-xl.jpg`,       tag: 'Más rendimiento' },
  'shampoo-limpieza-diaria':   { name: 'Shampoo Limpieza Diaria',      price: 13500, img: `${CLD}/v1779996546/becurlyfulcr/productos/shampoo-limpieza-diaria.jpg`,    tag: 'Suave sin sulfatos' },
  'shampoo-limpieza-profunda': { name: 'Shampoo Limpieza Profunda',    price: 14500, img: `${CLD}/v1779996547/becurlyfulcr/productos/shampoo-limpieza-profunda.jpg`,  tag: 'Detox capilar' },
  'acondicionador-revitalizante': { name: 'Acondicionador Revitalizante', price: 13500, img: `${CLD}/v1779996548/becurlyfulcr/productos/acondicionador-revitalizante.jpg`, tag: 'Suavidad y brillo' },
  'mascarilla-hidronutritiva': { name: 'Mascarilla Hidro-Nutritiva',   price: 15000, img: `${CLD}/v1779996550/becurlyfulcr/productos/mascarilla-hidronutritiva.jpg`,  tag: 'Tratamiento semanal' },
  'shampoo-kids':              { name: 'Shampoo KIDS',                 price: 12500, img: `${CLD}/v1779996552/becurlyfulcr/productos/shampoo-kids.jpg`,               tag: 'Sin lágrimas' },
  'acondicionador-kids':       { name: 'Acondicionador KIDS',          price: 12500, img: `${CLD}/v1779996554/becurlyfulcr/productos/acondicionador-kids.jpg`,        tag: 'Suaviza rizos' },
  'crema-peinar-kids':         { name: 'Crema para Peinar KIDS',       price: 11500, img: `${CLD}/v1779996555/becurlyfulcr/productos/crema-peinar-kids.jpg`,          tag: 'Define sin frizz' },
  'gel-liquido-kids':          { name: 'Gel Líquido KIDS',             price: 10000, img: `${CLD}/v1779996556/becurlyfulcr/productos/gel-liquido-kids.jpg`,           tag: 'Rizos definidos' },
};

/* ─── Mapeo de resultados según respuestas ─── */
const RESULTS = {
  kids: {
    title: 'Línea Kids Be Curlyful',
    desc: 'Fórmulas delicadas, sin lágrimas y con ingredientes naturales diseñados para los rizos de tus peques.',
    products: ['shampoo-kids', 'acondicionador-kids', 'crema-peinar-kids', 'gel-liquido-kids'],
  },
  'suave-frizz': {
    title: 'Rutina Antifrizzs para Ondas',
    desc: 'Domina el frizz y realzá tus ondas sin pesarlas con cremas ligeras y un activador suave.',
    products: ['shampoo-limpieza-diaria', 'activador-de-rizos', 'crema-gel-rizos'],
  },
  'suave-definicion': {
    title: 'Rutina Deficion para Ondas',
    desc: 'Marcá tus ondas y dales vida con productos que aportan forma sin rigidez.',
    products: ['activador-de-rizos', 'crema-hidratante-rizos', 'crema-gel-rizos'],
  },
  'suave-seco': {
    title: 'Rutina Hidratante para Ondas',
    desc: 'Rescatá tus ondas con una dosis intensa de hidratación que deja el cabello suave y brillante.',
    products: ['mascarilla-hidronutritiva', 'crema-hidratante-rizos', 'acondicionador-revitalizante'],
  },
  'medio-frizz': {
    title: 'Rutina Antifrizz para Rizos',
    desc: 'Controlá el frizz y definí tus rizos con productos de fijación media perfectos para el tipo 3.',
    products: ['shampoo-limpieza-profunda', 'activador-de-rizos', 'crema-gel-rizos'],
  },
  'medio-definicion': {
    title: 'Rutina Definición para Rizos',
    desc: 'Sacá el máximo partido a cada rizo con una combinación pensada para el tipo 3.',
    products: ['activador-de-rizos', 'mascarilla-hidronutritiva', 'crema-gel-rizos'],
  },
  'medio-seco': {
    title: 'Rutina Hidratante para Rizos',
    desc: 'Nutrición profunda para rizos sedientos — una mascarilla semanal cambia todo.',
    products: ['mascarilla-hidronutritiva', 'acondicionador-revitalizante', 'activador-de-rizos'],
  },
  'apretado-frizz': {
    title: 'Rutina Antifrizz para Rizos Apretados',
    desc: 'Fijación alta + limpieza profunda para rulos bien definidos y sin volumen incontrolable.',
    products: ['shampoo-limpieza-profunda', 'mascarilla-hidronutritiva', 'gel-alta-fijacion'],
  },
  'apretado-definicion': {
    title: 'Rutina Definición para Rizos Apretados',
    desc: 'Activá y fijá tus rulos apretados con la combinación más poderosa de la línea.',
    products: ['activador-de-rizos', 'gel-alta-fijacion', 'mascarilla-hidronutritiva'],
  },
  'apretado-seco': {
    title: 'Rutina Nutrición Profunda',
    desc: 'Rizos apretados necesitan hidratación extra — esta rutina los transforma en días.',
    products: ['mascarilla-hidronutritiva', 'acondicionador-revitalizante', 'gel-alta-fijacion'],
  },
};

function getResultKey(q1, q2) {
  if (q1 === 'kids') return 'kids';
  const type = { ondas: 'suave', rizos: 'medio', apretados: 'apretado' }[q1] || 'medio';
  const prob = { frizz: 'frizz', definicion: 'definicion', seco: 'seco' }[q2] || 'frizz';
  return `${type}-${prob}`;
}

/* ─── Preguntas ─── */
const Q1_OPTIONS = [
  {
    key: 'ondas',
    label: 'Ondas suaves',
    sub: 'Tipo 2A · 2B',
    img: `${CLD}/v1779996543/becurlyfulcr/productos/crema-hidratante-rizos.jpg`,
    color: 'from-amber-50 to-cream-50',
    accent: '#D4874A',
  },
  {
    key: 'rizos',
    label: 'Rizos bien formados',
    sub: 'Tipo 2C · 3B',
    img: `${CLD}/v1779996541/becurlyfulcr/productos/activador-de-rizos.jpg`,
    color: 'from-rose-50 to-cream-50',
    accent: '#CE6C8D',
  },
  {
    key: 'apretados',
    label: 'Rizos apretados',
    sub: 'Tipo 3C · 4A',
    img: `${CLD}/v1779996544/becurlyfulcr/productos/gel-alta-fijacion.jpg`,
    color: 'from-purple-50/40 to-cream-50',
    accent: '#8B5CF6',
  },
  {
    key: 'kids',
    label: 'Para mis peques',
    sub: 'Línea Kids',
    img: `${CLD}/v1779996552/becurlyfulcr/productos/shampoo-kids.jpg`,
    color: 'from-sky-50/40 to-cream-50',
    accent: '#0EA5E9',
  },
];

const Q2_OPTIONS = [
  {
    key: 'frizz',
    label: 'Frizz sin control',
    sub: 'El cabello se esponja y pierde forma',
    icon: '🌪️',
  },
  {
    key: 'definicion',
    label: 'Poca definición',
    sub: 'Los rizos caen o se mezclan',
    icon: '💤',
  },
  {
    key: 'seco',
    label: 'Cabello muy reseco',
    sub: 'Necesita hidratación urgente',
    icon: '🌵',
  },
];

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

/* ─── Quiz modal ─── */
export default function RizosQuiz({ onClose }) {
  const [step, setStep]     = useState(0); // 0=intro, 1=Q1, 2=Q2, 3=result
  const [q1, setQ1]         = useState(null);
  const [q2, setQ2]         = useState(null);
  const [addedAll, setAddedAll] = useState(false);
  const { addItem, openCart } = useCart();
  const toastSuccess = useToastStore((s) => s.success);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape key closes
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const pickQ1 = (val) => {
    setQ1(val);
    if (val === 'kids') {
      setStep(3); // skip Q2 for kids
    } else {
      setStep(2);
    }
  };

  const pickQ2 = (val) => {
    setQ2(val);
    setStep(3);
  };

  const result = step === 3 ? RESULTS[getResultKey(q1, q2)] : null;

  const addAll = () => {
    result?.products?.forEach((slug) => {
      const p = PRODS[slug];
      if (p) addItem({ slug, name: p.name, price: p.price, img: p.img }, 1);
    });
    setAddedAll(true);
    toastSuccess('Rutina agregada al carrito');
    setTimeout(() => { openCart(); onClose(); }, 600);
  };

  const restart = () => { setStep(1); setQ1(null); setQ2(null); setAddedAll(false); };

  const SLIDE = {
    initial:  { opacity: 0, x: 40 },
    animate:  { opacity: 1, x: 0 },
    exit:     { opacity: 0, x: -30 },
    transition: { duration: 0.3, ease: [0.3, 1, 0.3, 1] },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(35,26,27,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>

      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg bg-cream-50 rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden flex flex-col"
        style={{ maxHeight: '94dvh' }}>

        {/* Header fijo */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div>
            <p className="section-label !mb-0 text-[10px]">
              {step === 0 && 'Descubrí tu rutina'}
              {step === 1 && 'Pregunta 1 de 2'}
              {step === 2 && 'Pregunta 2 de 2'}
              {step === 3 && 'Tu rutina personalizada'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Barra de progreso */}
            {(step === 1 || step === 2) && (
              <div className="flex gap-1.5">
                {[1, 2].map((s) => (
                  <span key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s <= step ? 'w-6 bg-rose-500' : 'w-6 bg-cream-200'}`} />
                ))}
              </div>
            )}
            {step === 3 && (
              <button onClick={restart} className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 underline underline-offset-2">
                Repetir
              </button>
            )}
            <button onClick={onClose} aria-label="Cerrar"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-cream-100 text-ink-500 hover:text-ink-900 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="overflow-y-auto flex-1 px-5 pb-6">
          <AnimatePresence mode="wait">

            {/* INTRO */}
            {step === 0 && (
              <motion.div key="intro" {...SLIDE} className="text-center py-4">
                {/* Imagen decorativa — collage circular */}
                <div className="relative w-40 h-40 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-blob overflow-hidden animate-blob">
                    <img src={`${CLD}/v1779996541/becurlyfulcr/productos/activador-de-rizos.jpg`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-20 h-20 rounded-full overflow-hidden border-[3px] border-cream-50 shadow-card">
                    <img src={`${CLD}/v1779996550/becurlyfulcr/productos/mascarilla-hidronutritiva.jpg`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -top-2 -right-3 w-16 h-16 rounded-full overflow-hidden border-[3px] border-cream-50 shadow-card">
                    <img src={`${CLD}/v1779996552/becurlyfulcr/productos/shampoo-kids.jpg`} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>

                <h2 className="font-display font-semibold text-2xl text-ink-900 leading-tight mb-3">
                  ¿No sabés qué<br />
                  <span className="italic text-accent">producto elegir?</span>
                </h2>
                <p className="text-ink-500 text-[15px] leading-relaxed mb-7 max-w-xs mx-auto text-pretty">
                  Respondé 2 preguntas y te armamos una rutina personalizada para tus rizos.
                </p>
                <motion.button
                  onClick={() => setStep(1)}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary w-full py-4 text-base rounded-2xl">
                  Empezar el quiz
                </motion.button>
              </motion.div>
            )}

            {/* Q1 */}
            {step === 1 && (
              <motion.div key="q1" {...SLIDE}>
                <h2 className="font-display font-semibold text-xl text-ink-900 mb-5 leading-tight">
                  ¿Cómo son tus <span className="italic text-accent">rizos naturales</span>?
                </h2>
                <div className="space-y-3">
                  {Q1_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.key}
                      onClick={() => pickQ1(opt.key)}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center gap-4 p-3.5 rounded-[1.5rem] border-2 text-left transition-all bg-gradient-to-r ${opt.color} ${
                        q1 === opt.key ? 'border-rose-400 shadow-card' : 'border-cream-200 hover:border-rose-200'
                      }`}>
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-soft">
                        <img src={opt.img} alt={opt.label} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink-900 text-[15px] leading-tight">{opt.label}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: opt.accent }}>{opt.sub}</p>
                      </div>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        q1 === opt.key ? 'bg-rose-500 text-white' : 'border-2 border-cream-200 bg-white'
                      }`}>
                        {q1 === opt.key && <CheckIcon />}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Q2 */}
            {step === 2 && (
              <motion.div key="q2" {...SLIDE}>
                <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-[12px] text-ink-400 mb-4 hover:text-ink-600 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Volver
                </button>
                <h2 className="font-display font-semibold text-xl text-ink-900 mb-5 leading-tight">
                  ¿Cuál es tu <span className="italic text-accent">principal batalla</span>?
                </h2>
                <div className="space-y-3">
                  {Q2_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.key}
                      onClick={() => pickQ2(opt.key)}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] border-2 text-left transition-all bg-white ${
                        q2 === opt.key ? 'border-rose-400 shadow-card' : 'border-cream-200 hover:border-rose-200'
                      }`}>
                      <span className="text-3xl flex-shrink-0 leading-none">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink-900 text-[15px] leading-tight">{opt.label}</p>
                        <p className="text-[12px] text-ink-400 mt-0.5">{opt.sub}</p>
                      </div>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        q2 === opt.key ? 'bg-rose-500 text-white' : 'border-2 border-cream-200 bg-white'
                      }`}>
                        {q2 === opt.key && <CheckIcon />}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* RESULTADO */}
            {step === 3 && result && (
              <motion.div key="result" {...SLIDE}>
                {/* Chip de resultado */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <p className="text-[12px] font-bold text-rose-600 uppercase tracking-widest">Rutina encontrada</p>
                </div>

                <h2 className="font-display font-semibold text-xl text-ink-900 leading-tight mb-2">
                  {result.title}
                </h2>
                <p className="text-ink-500 text-[14px] leading-relaxed mb-5 text-pretty">{result.desc}</p>

                {/* Productos */}
                <div className="space-y-3 mb-6">
                  {result.products.map((slug, i) => {
                    const p = PRODS[slug];
                    if (!p) return null;
                    return (
                      <motion.div
                        key={slug}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.4 }}
                        className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-cream-200 shadow-soft">
                        <Link to={`/producto/${slug}`} onClick={onClose} className="flex-shrink-0">
                          <div className="w-14 h-14 rounded-xl overflow-hidden">
                            <img src={p.img} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">{p.tag}</p>
                          <Link to={`/producto/${slug}`} onClick={onClose}>
                            <p className="font-semibold text-ink-900 text-[13px] leading-tight mt-0.5 hover:text-rose-600 transition-colors">{p.name}</p>
                          </Link>
                          <p className="font-display font-semibold text-ink-900 text-[15px] mt-1">{formatCRC(p.price)}</p>
                        </div>
                        {/* Número de paso */}
                        <span className="w-7 h-7 rounded-full text-[11px] font-bold text-rose-500 border border-rose-200 flex items-center justify-center flex-shrink-0 bg-rose-50">
                          {i + 1}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Total + CTA */}
                <div className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-ink-500">Total de la rutina</p>
                    <p className="font-display font-semibold text-ink-900 text-lg">
                      {formatCRC(result.products.reduce((s, slug) => s + (PRODS[slug]?.price || 0), 0))}
                    </p>
                  </div>
                  <motion.button
                    onClick={addAll}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-[15px] transition-all ${
                      addedAll
                        ? 'bg-green-500 text-white'
                        : 'bg-rose-500 hover:bg-rose-600 text-white shadow-btn hover:shadow-btn-hover'
                    }`}>
                    {addedAll ? (
                      <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ¡Agregado al carrito!</>
                    ) : (
                      <><CartIcon /> Agregar rutina completa</>
                    )}
                  </motion.button>
                </div>

                <p className="text-center text-[12px] text-ink-400">
                  O tocá cada producto para ver su detalle.{' '}
                  <button onClick={restart} className="text-rose-500 font-semibold hover:underline">Repetir quiz</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
