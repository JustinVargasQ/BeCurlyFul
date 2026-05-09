import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { getProduct, prefetchProducts } from '../../lib/productCache';
import { optimizedImage } from '../../lib/api';
import useCartStore from '../../store/cartStore';
import useToastStore from '../../store/toastStore';
import useChatStore, { stripSugMarker, WELCOME } from '../../store/chatStore';

const QUICK_PROMPTS = [
  '¿Qué base recomendás para piel grasa?',
  'Buscame un labial rojo mate',
  'Ofertas en skincare',
  'Perfume femenino floral',
];

const WHATSAPP_URL = 'https://wa.me/50688045100?text=' + encodeURIComponent('Hola JD Virtual, vengo del chat de la web y necesito ayuda 💕');

/* Pull the topic of the most recent user message — used by the resume banner
 * to greet returning users with context ("¿seguís con labiales rojos?"). */
function lastUserTopic(messages) {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === 'user' && typeof m.content === 'string') {
      const text = m.content.trim();
      if (!text) continue;
      // Trim long messages and drop punctuation noise
      const clean = text.length > 40 ? text.slice(0, 37) + '…' : text;
      return clean;
    }
  }
  return null;
}

/* True if the most recent N model messages all lack a product card / combo
 * (i.e. the bot couldn't resolve to anything tangible). Used to surface a
 * persistent WhatsApp escalation when the bot keeps failing. */
function shouldOfferWhatsApp(messages, threshold = 3) {
  if (!Array.isArray(messages)) return false;
  const modelMsgs = messages.filter((m) => m && m.role === 'model' && typeof m.content === 'string');
  if (modelMsgs.length < threshold) return false;
  const recent = modelMsgs.slice(-threshold);
  // A message "resolved" if it contains a product slug or combo marker.
  const resolves = (text) =>
    /\[\[(combo:|[a-z0-9-]+\]\])/i.test(text.replace(/\[\[sug:[^\]]+\]\]/gi, ''));
  return recent.every((m) => !resolves(m.content));
}

/* Replace structured tokens with renderable parts.
 * Supported markers:
 *   [[product-slug]]                 → product card
 *   [[combo: slug1,slug2,slug3]]     → "Agregar todo al carrito" button
 *   [[link: Texto del botón|/ruta]]  → in-app navigation link
 * Plain text in between is wrapped with markdown-link parsing. */
function parseMessage(text) {
  const parts = [];
  // Order matters — match the longest/most specific patterns first.
  const regex = /\[\[combo:\s*([a-z0-9,\-\s]+)\]\]|\[\[link:\s*([^|\]]+)\|([^\]]+)\]\]|\[\[([a-z0-9-]+)\]\]/gi;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', value: text.slice(lastIdx, match.index) });
    }
    if (match[1] != null) {
      const slugs = [...new Set(
        match[1].split(',').map((s) => s.trim()).filter(Boolean)
      )];
      parts.push({ type: 'combo', slugs });
    } else if (match[2] != null && match[3] != null) {
      parts.push({ type: 'link', label: match[2].trim(), href: match[3].trim() });
    } else if (match[4] != null) {
      parts.push({ type: 'product', slug: match[4] });
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push({ type: 'text', value: text.slice(lastIdx) });
  return parts;
}

/* Render markdown links [text](url) inside a text fragment as clickable React elements. */
function renderTextWithLinks(value, keyPrefix = '') {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out = [];
  let last = 0;
  let m;
  let i = 0;
  while ((m = linkRegex.exec(value)) !== null) {
    if (m.index > last) out.push(value.slice(last, m.index));
    const label = m[1];
    const url = m[2];
    const isInternal = url.startsWith('/');
    if (isInternal) {
      out.push(
        <Link key={`${keyPrefix}-l-${i}`} to={url} className="text-rose-600 underline underline-offset-2 hover:text-rose-700 font-medium">
          {label}
        </Link>
      );
    } else {
      out.push(
        <a key={`${keyPrefix}-l-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-rose-600 underline underline-offset-2 hover:text-rose-700 font-medium">
          {label}
        </a>
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < value.length) out.push(value.slice(last));
  return out;
}

export function ProductPill({ slug }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const toastSuccess = useToastStore((s) => s.success);

  useEffect(() => {
    let cancelled = false;
    getProduct(slug)
      .then((p) => {
        if (cancelled) return;
        if (p) setProduct(p);
        else setError(true);
      })
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

  const outOfStock = product.stock === 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || added) return;
    addItem(product, 1);
    setAdded(true);
    openCart();
    toastSuccess(`${product.name} agregado al carrito`);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="my-2 flex items-center gap-2 p-2.5 bg-white rounded-2xl border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all group"
         style={{ boxShadow: '0 1px 3px rgba(184,95,114,0.06)' }}>
      <Link to={`/producto/${product.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <img
            src={optimizedImage(product.images?.[0], 96) || '/placeholder.png'}
            alt={product.name}
            className="w-12 h-12 object-cover rounded-lg ring-1 ring-rose-100"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink-900 truncate group-hover:text-rose-600 transition-colors leading-tight">
            {product.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] text-ink-500 truncate uppercase tracking-wider">{product.brand}</p>
            {/* Show rating only when there's actual social proof — at least 1 real review */}
            {product.reviewCount > 0 && product.rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {Number(product.rating).toFixed(1)}
                <span className="text-ink-400 font-normal">({product.reviewCount})</span>
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-rose-600 mt-0.5">
            ₡{product.price.toLocaleString('es-CR')}
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="ml-1.5 text-[10px] text-ink-400 line-through font-normal">
                ₡{product.oldPrice.toLocaleString('es-CR')}
              </span>
            )}
          </p>
        </div>
      </Link>
      <button
        onClick={handleAdd}
        disabled={outOfStock || added}
        aria-label={outOfStock ? 'Agotado' : 'Agregar al carrito'}
        title={outOfStock ? 'Agotado' : 'Agregar al carrito'}
        className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all ${
          outOfStock
            ? 'bg-cream-100 text-ink-300 cursor-not-allowed'
            : added
              ? 'bg-emerald-500 text-white scale-95'
              : 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95'
        }`}>
        {added ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        )}
      </button>
    </div>
  );
}

/* Bulk "Agregar todo al carrito" button for [[combo: slug1,slug2,...]] markers */
export function ComboAddButton({ slugs }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const toastSuccess = useToastStore((s) => s.success);

  // Dedup at the slug level (defensive — backend should already dedup)
  const uniqueSlugs = [...new Set(slugs)];

  useEffect(() => {
    let cancelled = false;
    prefetchProducts(uniqueSlugs).then((results) => {
      if (cancelled) return;
      // Dedup by product id too — two distinct slugs might resolve to the
      // same product (e.g. legacy slug + new slug).
      const byId = new Map();
      for (const p of results) {
        if (!p) continue;
        const key = String(p.id || p._id || p.slug);
        if (!byId.has(key)) byId.set(key, p);
      }
      setProducts([...byId.values()]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [uniqueSlugs.join(',')]);

  if (loading || products.length === 0) return null;

  const inStock = products.filter((p) => p.stock !== 0);
  const outOfStock = products.length - inStock.length;
  const missing = uniqueSlugs.length - products.length;
  const total = inStock.reduce((s, p) => s + p.price, 0);
  const count = inStock.length;

  const handleAdd = () => {
    if (added || count === 0) return;
    inStock.forEach((p) => addItem(p, 1));
    setAdded(true);
    openCart();
    toastSuccess(`${count} producto${count === 1 ? '' : 's'} agregado${count === 1 ? '' : 's'} al carrito`);
    setTimeout(() => setAdded(false), 2400);
  };

  const warnings = [];
  if (outOfStock > 0) warnings.push(`${outOfStock} agotado${outOfStock === 1 ? '' : 's'}`);
  if (missing > 0)    warnings.push(`${missing} no disponible${missing === 1 ? '' : 's'}`);

  return (
    <div className="my-2">
    {warnings.length > 0 && (
      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 mb-1.5 flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        {warnings.join(' · ')} no se incluirán
      </p>
    )}
    <button
      onClick={handleAdd}
      disabled={added || count === 0}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
        added
          ? 'bg-emerald-500 text-white'
          : count === 0
            ? 'bg-cream-100 text-ink-400 cursor-not-allowed'
            : 'text-white shadow-md hover:shadow-lg active:scale-[0.98]'
      }`}
      style={
        added || count === 0
          ? undefined
          : { background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)' }
      }>
      {added ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Agregado
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          Agregar {count} producto{count === 1 ? '' : 's'} · ₡{total.toLocaleString('es-CR')}
        </>
      )}
    </button>
    </div>
  );
}

/* In-app link button rendered from [[link: Label|/path]] */
export function LinkButton({ label, href }) {
  const isInternal = href.startsWith('/');
  const className = 'my-2 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all';
  const style = { background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)' };
  if (isInternal) {
    return (
      <Link to={href} className={className} style={style}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
      {label}
    </a>
  );
}

export function MessageBubble({ msg, isStreaming }) {
  const isUser = msg.role === 'user';
  const visibleText = isUser ? msg.content : stripSugMarker(msg.content);
  const parts = isUser ? [{ type: 'text', value: visibleText }] : parseMessage(visibleText);
  const isEmpty = !isUser && visibleText.length === 0;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2.5`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
          isUser
            ? 'text-white rounded-br-md'
            : 'bg-white text-ink-900 rounded-bl-md border border-rose-100/70'
        }`}
        style={
          isUser
            ? {
                background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 60%, #E39DAB 100%)',
                boxShadow: '0 2px 8px rgba(184,95,114,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
              }
            : undefined
        }>
        {isEmpty && isStreaming ? (
          <div className="flex gap-1 py-0.5">
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
          </div>
        ) : (
          parts.map((p, i) => {
            if (p.type === 'text') {
              return (
                <span key={i} className="whitespace-pre-wrap leading-relaxed">
                  {renderTextWithLinks(p.value, `m${i}`)}
                </span>
              );
            }
            if (p.type === 'product') return <ProductPill key={i} slug={p.slug} />;
            if (p.type === 'combo')   return <ComboAddButton key={i} slugs={p.slugs} />;
            if (p.type === 'link')    return <LinkButton key={i} label={p.label} href={p.href} />;
            return null;
          })
        )}
        {isStreaming && !isEmpty && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-rose-400 rounded-sm align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
}

/* ─── Shared inner panel UI used by both the floating widget and any embed ─── */
export function ChatPanelInner({ onReset, onClose, showHeader = true }) {
  const messages = useChatStore((s) => s.messages);
  const loading = useChatStore((s) => s.loading);
  const send = useChatStore((s) => s.send);
  const reset = useChatStore((s) => s.reset);
  const showResume = useChatStore((s) => s.showResume);
  const dismissResume = useChatStore((s) => s.dismissResume);
  const resumeTopic = lastUserTopic(messages);

  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    send(input);
    setInput('');
  };

  const handleQuickSend = (text) => {
    if (loading) return;
    send(text);
  };

  const handleReset = () => {
    reset();
    if (onReset) onReset();
  };

  return (
    <>
      {showHeader && (
        <div
          className="relative px-5 py-4 text-white overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1A1414 0%, #2E1A1F 25%, #6B3540 55%, #B85F72 85%, #C9A875 100%)' }}>

          {/* Sparkle pattern overlay */}
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><path d='M20 4l1 4 4 1-4 1-1 4-1-4-4-1 4-1z' fill='white' opacity='0.5'/><path d='M32 22l0.5 2 2 0.5-2 0.5-0.5 2-0.5-2-2-0.5 2-0.5z' fill='white' opacity='0.4'/><path d='M8 28l0.5 1.5 1.5 0.5-1.5 0.5-0.5 1.5-0.5-1.5-1.5-0.5 1.5-0.5z' fill='white' opacity='0.4'/></svg>\")",
              backgroundSize: '120px 120px',
            }}
          />

          {/* Shimmer sweep */}
          <motion.span
            animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
            }}
          />

          <div className="relative flex items-center gap-3">
            {/* Avatar with online dot */}
            <div className="relative flex-shrink-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="drop-shadow-sm">
                  <path d="M12 2L13.5 7.5L19 9L13.5 10.5L12 16L10.5 10.5L5 9L10.5 7.5L12 2Z"/>
                  <path d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z"/>
                  <path d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z"/>
                </svg>
              </div>
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#2E1A1F] shadow-sm"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-display font-bold text-[15px] leading-tight tracking-tight">
                  JD Asistente
                </p>
                <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold tracking-wider"
                      style={{ background: 'linear-gradient(135deg, #C9A875 0%, #E0BD8C 100%)', color: '#1A1414' }}>
                  IA
                </span>
              </div>
              <p className="text-[11px] text-white/80 flex items-center gap-1.5 leading-tight mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Tu asesora de belleza · 24/7
              </p>
            </div>

            <button
              onClick={handleReset}
              aria-label="Reiniciar conversación"
              className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/90 hover:text-white"
              title="Nueva conversación">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/90 hover:text-white">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages area — soft cream gradient background */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 relative"
           style={{
             background: 'linear-gradient(180deg, #FDF7F4 0%, #FAF1EC 100%)',
           }}>
        {/* Subtle decorative pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><path d='M24 6l1 4 4 1-4 1-1 4-1-4-4-1 4-1z' fill='%23B85F72'/></svg>\")",
            backgroundSize: '90px 90px',
          }}
        />

        <div className="relative">
          {/* Welcome-back banner — visible when user reopens after 30min+ */}
          {showResume && resumeTopic && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-3 px-3.5 py-2.5 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-cream-50 text-ink-700 text-sm flex items-start gap-2.5">
              <span className="text-rose-500 text-base leading-none mt-0.5">👋</span>
              <div className="flex-1 leading-tight">
                <p className="font-semibold text-ink-900">¡Bienvenida de vuelta!</p>
                <p className="text-xs text-ink-600 mt-0.5">
                  Estabas buscando: <span className="font-medium">"{resumeTopic}"</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { dismissResume(); send(`Seguíme mostrando ${resumeTopic}`); }}
                    className="text-xs px-2.5 py-1 rounded-full bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors">
                    Seguir
                  </button>
                  <button
                    onClick={dismissResume}
                    className="text-xs px-2.5 py-1 rounded-full bg-white text-ink-500 font-semibold border border-cream-200 hover:border-ink-300 transition-colors">
                    Empezar de nuevo
                  </button>
                </div>
              </div>
              <button
                onClick={dismissResume}
                aria-label="Cerrar"
                className="text-ink-300 hover:text-ink-500 -mr-1 -mt-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </motion.div>
          )}

          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <MessageBubble
                key={i}
                msg={m}
                isStreaming={isLast && loading && m.role === 'model'}
              />
            );
          })}

          {messages.length === 1 && !loading && (
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <motion.button
                  key={q}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleQuickSend(q)}
                  className="text-xs px-3.5 py-2 bg-white text-rose-600 font-medium rounded-full transition-all shadow-sm hover:shadow-md"
                  style={{
                    border: '1px solid transparent',
                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #E39DAB 0%, #C9A875 100%)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}>
                  {q}
                </motion.button>
              ))}
            </div>
          )}

          {!loading && (() => {
            const lastMsg = messages[messages.length - 1];
            if (!lastMsg || lastMsg.role !== 'model') return null;
            const sugs = lastMsg.suggestions || [];
            if (sugs.length === 0) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-2 mb-2 flex flex-wrap gap-1.5">
                {sugs.map((s) => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleQuickSend(s)}
                    className="text-xs px-3 py-1.5 bg-white text-rose-600 font-medium rounded-full transition-all shadow-sm hover:shadow-md"
                    style={{
                      border: '1px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #E39DAB 0%, #C9A875 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}>
                    {s}
                  </motion.button>
                ))}
              </motion.div>
            );
          })()}
        </div>
      </div>

      {/* WhatsApp escalation — surfaces when bot has had 3+ consecutive non-resolving replies */}
      {shouldOfferWhatsApp(messages) && !loading && (
        <motion.a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.520-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.298-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
          </svg>
          <span className="flex-1 leading-tight">¿Necesitás ayuda más directa? <span className="font-bold">Hablar por WhatsApp</span></span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </motion.a>
      )}

      {/* Input form — elegant rounded with gradient send button */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-rose-100/60 bg-white/90 backdrop-blur-sm">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Preguntame algo..."
          maxLength={500}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm rounded-full bg-cream-50 border border-cream-200 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200/50 focus:bg-white disabled:opacity-50 transition-all placeholder:text-ink-400"
        />
        <motion.button
          whileHover={!loading && input.trim() ? { scale: 1.08, rotate: -8 } : {}}
          whileTap={{ scale: 0.92 }}
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Enviar"
          className="relative w-10 h-10 flex items-center justify-center rounded-full text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 50%, #C9A875 100%)',
            boxShadow: !loading && input.trim()
              ? '0 4px 12px rgba(184,95,114,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
              : 'none',
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="relative">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </motion.button>
      </form>

      <p className="text-[10px] text-center text-ink-400 pb-2 px-3 bg-white">
        Powered by Gemini · Las respuestas pueden contener errores
      </p>
    </>
  );
}

export default function ChatbotWidget() {
  const location = useLocation();
  const open = useChatStore((s) => s.panelOpen);
  const unread = useChatStore((s) => s.unread);
  const openPanel = useChatStore((s) => s.openPanel);
  const closePanel = useChatStore((s) => s.closePanel);
  const reduceMotion = useReducedMotion();

  const [visible, setVisible] = useState(false);
  // Greet tooltip — show once per session, then leave the user alone.
  const [showGreeting, setShowGreeting] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('jd-chat-greeted');
  });

  const hidden =
    location.pathname.startsWith('/admin') ||
    location.pathname === '/checkout' ||
    location.pathname === '/confirmacion';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showGreeting) return;
    // Mark greeted after the tooltip's first appearance window
    const t = setTimeout(() => {
      sessionStorage.setItem('jd-chat-greeted', '1');
      setShowGreeting(false);
    }, 7000);
    return () => clearTimeout(t);
  }, [showGreeting]);

  if (hidden) return null;

  // Skip the heavier decorative animations when the user prefers reduced motion
  // (system setting) or on small screens where they cost battery without payoff.
  const heavyDecorClass = reduceMotion ? 'hidden' : 'hidden sm:block';

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {visible && !open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed bottom-6 right-5 z-40">

            {showGreeting && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: [0, 1, 1, 0], x: [10, 0, 0, 10] }}
                transition={{
                  duration: 4,
                  times: [0, 0.15, 0.85, 1],
                  delay: 3,
                }}
                className="absolute right-[72px] top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none hidden sm:block">
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
            )}

            {/* ─── Outer pulsing aura — soft rose-gold breath. Inner aura kept on
                 mobile for a tiny bit of depth; outer two are desktop-only. ─── */}
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(184,95,114,0.7) 0%, rgba(201,168,117,0.4) 50%, transparent 100%)',
                filter: 'blur(10px)',
              }}
            />
            {/* Second aura — offset for layering (desktop only) */}
            <motion.span
              animate={{ scale: [1, 1.7, 1], opacity: [0.45, 0, 0.45] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut', delay: 1.3 }}
              className={`absolute inset-0 rounded-full pointer-events-none border-2 ${heavyDecorClass}`}
              style={{ borderColor: 'rgba(201,168,117,0.55)' }}
            />
            {/* Third aura — outermost (desktop only) */}
            <motion.span
              animate={{ scale: [1, 1.95, 1], opacity: [0.25, 0, 0.25] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
              className={`absolute inset-0 rounded-full pointer-events-none border ${heavyDecorClass}`}
              style={{ borderColor: 'rgba(184,95,114,0.4)' }}
            />

            {/* Floating sparkle particles — desktop only (heavy on mobile battery) */}
            <div className={heavyDecorClass}>
            {[
              { x: -20, y: -24, delay: 0,    size: 6, color: '#E0BD8C' },
              { x: 24,  y: -16, delay: 1.0,  size: 4, color: '#E39DAB' },
              { x: -14, y: 26,  delay: 2.0,  size: 5, color: '#C9A875' },
              { x: 28,  y: 20,  delay: 0.6,  size: 3, color: '#FFD9A8' },
              { x: 0,   y: -30, delay: 1.5,  size: 4, color: '#E0BD8C' },
              { x: -28, y: 4,   delay: 2.4,  size: 3, color: '#E39DAB' },
            ].map((s, i) => (
              <motion.span
                key={i}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  y: [s.y, s.y - 14, s.y],
                  x: [s.x, s.x + (i % 2 === 0 ? 4 : -4), s.x],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  delay: s.delay,
                  ease: 'easeInOut',
                }}
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{
                  width: s.size,
                  height: s.size,
                  background: s.color,
                  borderRadius: '50%',
                  boxShadow: `0 0 10px ${s.color}, 0 0 4px ${s.color}`,
                  transform: `translate(${s.x}px, ${s.y}px)`,
                }}
              />
            ))}
            </div>

            <motion.button
              onClick={openPanel}
              aria-label="Abrir asistente JD"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.05, 1, 1.05, 1],
                      rotate: [0, 0, 0, 0, -8, 8, -6, 6, -3, 3, 0, 0],
                    }
              }
              transition={
                reduceMotion
                  ? undefined
                  : {
                      scale: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
                      rotate: {
                        duration: 8,
                        times: [0, 0.6, 0.62, 0.65, 0.68, 0.72, 0.76, 0.8, 0.84, 0.88, 0.92, 1],
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                    }
              }
              whileHover={{ scale: 1.15, rotate: -8, transition: { duration: 0.25 } }}
              whileTap={{ scale: 0.88 }}
              className="relative flex items-center justify-center w-[68px] h-[68px] rounded-full overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #8B3F52 0%, #B85F72 25%, #D17D8D 50%, #E8B5A0 75%, #C9A875 100%)',
                boxShadow:
                  '0 6px 24px rgba(184,95,114,0.55), 0 14px 40px rgba(201,168,117,0.35), inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -3px 6px rgba(80,30,40,0.25)',
              }}>

              {/* Top highlight reflection — for 3D depth */}
              <span
                className="absolute top-0 left-0 right-0 pointer-events-none"
                style={{
                  height: '55%',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 70%, transparent 100%)',
                  borderTopLeftRadius: '999px',
                  borderTopRightRadius: '999px',
                }}
              />

              {/* Rotating conic gradient — subtle premium ring */}
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-[3px] rounded-full pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.45) 30deg, transparent 70deg, transparent 180deg, rgba(255,224,180,0.55) 210deg, transparent 250deg)',
                  WebkitMask: 'radial-gradient(circle, transparent 58%, black 65%)',
                  mask: 'radial-gradient(circle, transparent 58%, black 65%)',
                  opacity: 0.7,
                }}
              />

              {/* Shimmer sweep — diagonal */}
              <motion.span
                animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                  backgroundSize: '200% 100%',
                }}
              />

              {/* Sparkle icon — gentle bobbing */}
              <motion.svg
                width="32" height="32" viewBox="0 0 24 24" fill="white"
                animate={{
                  y: [0, -1.5, 0, 1.5, 0],
                  rotate: [0, 6, 0, -6, 0],
                  scale: [1, 1.05, 1, 1.05, 1],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative drop-shadow-md">
                <path d="M12 2L13.5 7.5L19 9L13.5 10.5L12 16L10.5 10.5L5 9L10.5 7.5L12 2Z"/>
                <path d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z"/>
                <path d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z"/>
              </motion.svg>

              {/* IA badge with shine sweep */}
              <span
                className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white tracking-wider overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #1A1414 0%, #2E2626 100%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}>
                <motion.span
                  animate={{ x: ['-120%', '220%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 4 }}
                  className="absolute inset-y-0 w-1/2 pointer-events-none"
                  style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.45), transparent)' }}
                />
                <span className="relative">IA</span>
              </span>

              {/* Unread indicator — coral with pulse */}
              {unread && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute top-1 right-1 w-3.5 h-3.5 bg-coral rounded-full border-2 border-white shadow-lg"
                  style={{ boxShadow: '0 0 8px rgba(255,127,107,0.8)' }}
                />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel popup */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-2 left-2 right-2 sm:left-auto sm:bottom-4 sm:right-4 z-50 sm:w-[400px] h-[calc(100dvh-1rem)] sm:h-[600px] sm:max-h-[calc(100dvh-2rem)]">

            {/* Ambient glow behind */}
            <motion.div
              animate={{ opacity: [0.5, 0.75, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-4 rounded-[2rem] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(184,95,114,0.35) 0%, rgba(201,168,117,0.2) 50%, transparent 80%)',
                filter: 'blur(24px)',
                zIndex: -1,
              }}
            />

            {/* Gradient border wrapper */}
            <div
              className="relative h-full rounded-3xl p-[1.5px] shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #B85F72 0%, #D17D8D 30%, #E39DAB 55%, #C9A875 100%)',
              }}>
              <div className="flex flex-col h-full bg-white rounded-[calc(1.5rem-1.5px)] overflow-hidden">
                <ChatPanelInner onClose={closePanel} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
