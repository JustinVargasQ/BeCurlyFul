import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import api from '../../lib/api';
import useCartStore from '../../store/cartStore';
import useToastStore from '../../store/toastStore';

const STORAGE_KEY = 'jd-chatbot-history';
const MAX_STORED_MESSAGES = 20;

const WELCOME = {
  role: 'model',
  content:
    '¡Hola! Soy JD Asistente 💕\nTe armo combos según tu presupuesto, recomiendo productos y te los agrego al carrito al toque.\n\n💡 Probá decime: "Tengo ₡30.000 y quiero skincare" y te armo la lista.',
};

const QUICK_PROMPTS = [
  'Tengo ₡20.000 y quiero skincare 💸',
  'Armame un kit de maquillaje básico',
  '¿Qué base recomendás para piel grasa?',
  'Buscame un labial rojo mate',
  'Perfume femenino floral',
];

/* Parse [[slug]] tokens AND detect "💰 Total: ₡X.XXX" line */
function parseMessage(text) {
  const parts = [];
  const regex = /\[\[([a-z0-9-]+)\]\]/gi;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', value: text.slice(lastIdx, match.index) });
    }
    parts.push({ type: 'product', slug: match[1] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push({ type: 'text', value: text.slice(lastIdx) });
  return parts;
}

/* Cache of product lookups so we don't hit the API repeatedly */
const productCache = new Map();
function fetchProduct(slug) {
  if (productCache.has(slug)) return productCache.get(slug);
  const promise = api.get(`/products/${slug}`).then((r) => r.data).catch(() => null);
  productCache.set(slug, promise);
  return promise;
}

function ProductPill({ slug, onLoaded }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    let cancelled = false;
    fetchProduct(slug).then((data) => {
      if (cancelled) return;
      if (!data) { setError(true); return; }
      setProduct(data);
      onLoaded?.(slug, data);
    });
    return () => { cancelled = true; };
  }, [slug, onLoaded]);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product || added) return;
    addItem({
      id: product._id || product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      slug: product.slug,
    }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  if (error) return null;

  if (!product) {
    return (
      <div className="flex items-center gap-3 my-2 p-2 bg-cream-50 rounded-xl border border-cream-200 animate-pulse">
        <div className="w-12 h-12 bg-cream-200 rounded-lg" />
        <div className="flex-1 h-4 bg-cream-200 rounded" />
      </div>
    );
  }

  const inStock = product.stock === null || product.stock === undefined || product.stock > 0;

  return (
    <div className="flex items-center gap-2 my-2 p-2 bg-white rounded-xl border border-rose-100 hover:border-rose-300 hover:shadow-sm transition-all group">
      <Link to={`/producto/${product.slug}`} className="flex items-center gap-2 flex-1 min-w-0">
        <img
          src={product.images?.[0] || '/placeholder.png'}
          alt={product.name}
          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-ink-900 truncate group-hover:text-rose-600">
            {product.name}
          </p>
          <p className="text-[10px] text-ink-500 truncate">{product.brand}</p>
          <p className="text-xs font-semibold text-rose-600">
            ₡{product.price.toLocaleString('es-CR')}
          </p>
        </div>
      </Link>

      <button
        onClick={handleAdd}
        disabled={!inStock || added}
        aria-label={added ? 'Agregado' : 'Agregar al carrito'}
        title={inStock ? 'Agregar al carrito' : 'Agotado'}
        className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all ${
          added
            ? 'bg-green-500 text-white'
            : inStock
              ? 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95'
              : 'bg-ink-200 text-ink-400 cursor-not-allowed'
        }`}>
        {added ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        )}
      </button>
    </div>
  );
}

function MessageBubble({ msg, onProductLoaded }) {
  const isUser = msg.role === 'user';
  const parts = isUser ? [{ type: 'text', value: msg.content }] : parseMessage(msg.content);

  // Collect slugs in this message — if 2+, show "Add all to cart"
  const slugs = parts.filter((p) => p.type === 'product').map((p) => p.slug);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-rose-500 text-white rounded-br-sm'
            : 'bg-cream-50 text-ink-900 rounded-bl-sm'
        }`}>
        {parts.map((p, i) =>
          p.type === 'text' ? (
            <span key={i} className="whitespace-pre-wrap">{p.value}</span>
          ) : (
            <ProductPill key={i} slug={p.slug} onLoaded={onProductLoaded} />
          )
        )}

        {!isUser && slugs.length >= 2 && (
          <BulkAddButton slugs={slugs} />
        )}
      </div>
    </div>
  );
}

function BulkAddButton({ slugs }) {
  const [done, setDone] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const toastSuccess = useToastStore((s) => s.success);

  const handleAddAll = async () => {
    if (done) return;
    const products = await Promise.all(slugs.map(fetchProduct));
    const valid = products.filter(Boolean);
    let added = 0;
    valid.forEach((p) => {
      const inStock = p.stock === null || p.stock === undefined || p.stock > 0;
      if (!inStock) return;
      addItem({
        id: p._id || p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0],
        slug: p.slug,
      }, 1);
      added++;
    });
    setDone(true);
    toastSuccess(`${added} producto${added !== 1 ? 's' : ''} agregado${added !== 1 ? 's' : ''} al carrito`);
    setTimeout(() => openCart(), 600);
  };

  return (
    <button
      onClick={handleAddAll}
      disabled={done}
      className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
        done
          ? 'bg-green-500 text-white'
          : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-btn hover:shadow-btn-hover active:scale-[0.98]'
      }`}>
      {done ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ¡Agregado al carrito!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          Agregar todos al carrito ({slugs.length})
        </>
      )}
    </button>
  );
}

export default function ChatbotWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const cartItems = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.openCart);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const hidden = location.pathname.startsWith('/admin') ||
                 location.pathname === '/checkout' ||
                 location.pathname === '/confirmacion';

  // Load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
  }, []);

  // Persist history
  useEffect(() => {
    try {
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {}
  }, [messages]);

  // Show after small delay
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);

  // Autoscroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const send = async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const payload = {
        messages: next.filter((m) => m !== WELCOME || next.length > 1).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
      const res = await api.post('/chatbot', payload);
      const reply = res.data?.reply || 'No pude generar una respuesta. Intentá de nuevo.';
      setMessages((prev) => [...prev, { role: 'model', content: reply }]);
      if (!open) setUnread(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Hubo un error. Intentá de nuevo en un momento.';
      setMessages((prev) => [...prev, { role: 'model', content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const reset = () => {
    setMessages([WELCOME]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  if (hidden) return null;

  return (
    <>
      {/* Floating button — eye-catching with glow, breathing, sparkles, tooltip */}
      <AnimatePresence>
        {visible && !open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed bottom-6 right-5 z-40">

            {/* Tooltip label — appears periodically */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: [0, 1, 1, 0], x: [10, 0, 0, 10] }}
              transition={{
                duration: 4,
                times: [0, 0.15, 0.85, 1],
                repeat: Infinity,
                repeatDelay: 8,
                delay: 3,
              }}
              className="absolute right-[72px] top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none">
              <div className="relative bg-white px-3.5 py-2 rounded-2xl shadow-card border border-rose-100">
                <p className="text-xs font-semibold text-ink-900">
                  ¡Hola! Soy <span className="text-rose-500">JD</span> ✨
                </p>
                <p className="text-[10px] text-ink-500">Tu asesora de belleza IA</p>
                <div
                  className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-b border-rose-100"
                  style={{ transform: 'translateY(-50%) rotate(-45deg)' }}
                />
              </div>
            </motion.div>

            {/* Outer glow ring — soft pulsing aura */}
            <motion.span
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.55, 0, 0.55],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(184,95,114,0.6) 0%, rgba(201,168,117,0.3) 60%, transparent 100%)',
                filter: 'blur(8px)',
              }}
            />

            {/* Second pulse ring — offset timing for layered effect */}
            <motion.span
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 1.2 }}
              className="absolute inset-0 rounded-full pointer-events-none border-2"
              style={{ borderColor: 'rgba(184,95,114,0.5)' }}
            />

            {/* Floating sparkle particles */}
            {[
              { x: -18, y: -22, delay: 0,    size: 6 },
              { x: 22,  y: -14, delay: 1.2,  size: 4 },
              { x: -12, y: 24,  delay: 2.1,  size: 5 },
              { x: 26,  y: 18,  delay: 0.8,  size: 3 },
            ].map((s, i) => (
              <motion.span
                key={i}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  y: [s.y, s.y - 12, s.y],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  delay: s.delay,
                  ease: 'easeInOut',
                }}
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{
                  width: s.size,
                  height: s.size,
                  background: '#C9A875',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px #C9A875',
                  transform: `translate(${s.x}px, ${s.y}px)`,
                }}
              />
            ))}

            {/* Main button with breathing animation */}
            <motion.button
              onClick={() => setOpen(true)}
              aria-label="Abrir asistente JD"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.12, rotate: -3 }}
              whileTap={{ scale: 0.92 }}
              className="relative flex items-center justify-center w-16 h-16 rounded-full overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 35%, #E39DAB 60%, #C9A875 100%)',
                boxShadow:
                  '0 4px 20px rgba(184,95,114,0.45), 0 8px 32px rgba(201,168,117,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
              }}>

              {/* Animated shimmer overlay */}
              <motion.span
                animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
                  backgroundSize: '200% 100%',
                }}
              />

              {/* Sparkle icon */}
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="white"
                className="relative drop-shadow-sm">
                <path d="M12 2L13.5 7.5L19 9L13.5 10.5L12 16L10.5 10.5L5 9L10.5 7.5L12 2Z"/>
                <path d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z"/>
                <path d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z"/>
              </svg>

              {/* "IA" badge — bottom-right of button */}
              <span
                className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #1A1414 0%, #2E2626 100%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>
                IA
              </span>

              {/* Unread indicator */}
              {unread && (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute top-1 right-1 w-3.5 h-3.5 bg-coral rounded-full border-2 border-white"
                />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-4 right-4 z-50 flex flex-col w-[calc(100vw-2rem)] sm:w-96 h-[80vh] sm:h-[560px] max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-modal overflow-hidden border border-cream-200">

            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 text-white"
              style={{ background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 100%)' }}>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L13.5 7.5L19 9L13.5 10.5L12 16L10.5 10.5L5 9L10.5 7.5L12 2Z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">JD Asistente</p>
                <p className="text-xs text-white/80 leading-tight">Asesora de belleza · IA</p>
              </div>

              {/* Cart preview button — visible when items exist */}
              {cartCount > 0 && (
                <button
                  onClick={() => openCart()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg transition-colors"
                  title="Ver carrito">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <span className="text-[11px] font-bold">{cartCount}</span>
                  <span className="text-[10px] opacity-90 hidden sm:inline">
                    ₡{cartTotal.toLocaleString('es-CR')}
                  </span>
                </button>
              )}

              <button
                onClick={reset}
                aria-label="Reiniciar conversación"
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                title="Nueva conversación">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 bg-cream-50/30">
              {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}

              {loading && (
                <div className="flex justify-start mb-2">
                  <div className="bg-cream-50 rounded-2xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                      <span className="w-2 h-2 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                      <span className="w-2 h-2 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick prompts shown only on initial state */}
              {messages.length === 1 && !loading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-xs px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded-full hover:bg-rose-50 hover:border-rose-300 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-cream-200 bg-white">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Decime tu presupuesto o qué buscás..."
                maxLength={500}
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm rounded-full bg-cream-50 border border-cream-200 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Enviar"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>

            <p className="text-[10px] text-center text-ink-400 pb-2 px-3">
              Powered by Gemini · Las respuestas pueden contener errores
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
