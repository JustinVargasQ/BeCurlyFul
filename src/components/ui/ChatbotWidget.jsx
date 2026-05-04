import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import api from '../../lib/api';

const STORAGE_KEY = 'jd-chatbot-history';
const MAX_STORED_MESSAGES = 20;

const WELCOME = {
  role: 'model',
  content:
    '¡Hola! Soy JD Asistente 💕 Te ayudo a encontrar productos de maquillaje, skincare, perfumes o cuidado capilar. ¿Qué buscás hoy?',
};

const QUICK_PROMPTS = [
  '¿Qué base recomendás para piel grasa?',
  'Buscame un labial rojo mate',
  'Ofertas en skincare',
  'Perfume femenino floral',
];

/* Replace [[slug]] tokens with product card markers we can render later */
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

function ProductPill({ slug }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(`/products/${slug}`)
      .then((r) => { if (!cancelled) setProduct(r.data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [slug]);

  if (error) return null;

  if (!product) {
    return (
      <div className="flex items-center gap-3 my-2 p-2 bg-cream-50 rounded-xl border border-cream-200 animate-pulse">
        <div className="w-12 h-12 bg-cream-200 rounded-lg" />
        <div className="flex-1 h-4 bg-cream-200 rounded" />
      </div>
    );
  }

  return (
    <Link
      to={`/producto/${product.slug}`}
      className="flex items-center gap-3 my-2 p-2 bg-white rounded-xl border border-rose-100 hover:border-rose-300 hover:shadow-sm transition-all group">
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
        <p className="text-xs text-ink-500 truncate">{product.brand}</p>
        <p className="text-xs font-semibold text-rose-600">
          ₡{product.price.toLocaleString('es-CR')}
        </p>
      </div>
    </Link>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const parts = isUser ? [{ type: 'text', value: msg.content }] : parseMessage(msg.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-rose-500 text-white rounded-br-sm'
            : 'bg-cream-50 text-ink-900 rounded-bl-sm'
        }`}>
        {parts.map((p, i) =>
          p.type === 'text' ? (
            <span key={i} className="whitespace-pre-wrap">{p.value}</span>
          ) : (
            <ProductPill key={i} slug={p.slug} />
          )
        )}
      </div>
    </div>
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
      {/* Floating button */}
      <AnimatePresence>
        {visible && !open && (
          <motion.button
            onClick={() => setOpen(true)}
            aria-label="Abrir asistente JD"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-24 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-btn-hover"
            style={{
              background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)',
            }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L13.5 7.5L19 9L13.5 10.5L12 16L10.5 10.5L5 9L10.5 7.5L12 2Z" fill="white" stroke="none"/>
              <path d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z" fill="white" stroke="none"/>
            </svg>
            {unread && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-coral rounded-full border-2 border-white" />
            )}
          </motion.button>
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
                placeholder="Preguntame algo..."
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
