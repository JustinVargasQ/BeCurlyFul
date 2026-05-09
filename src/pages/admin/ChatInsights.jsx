import { useState, useEffect } from 'react';
import api from '../../lib/api';

const USE_API = import.meta.env.VITE_API_URL;

const KIND_LABEL = {
  greeting: 'Saludo',
  thanks: 'Agradecimiento',
  chitchat: 'Charla',
  ack: 'Confirmación',
  pack: 'Pack',
  tracking: 'Rastreo',
  how_to_buy: 'Cómo comprar',
  location: 'Ubicación',
  off_topic: 'Off-topic',
  vague_recommendation: 'Vago',
  budget_choose: 'Eligiendo presupuesto',
  combo: 'Combo armado',
  cart_redirect: 'Carrito',
  whatsapp_redirect: 'WhatsApp',
  change_ask: 'Cambiar (ask)',
  change_alternatives: 'Cambiar (alt)',
  change_no_alt: 'Sin alternativa',
  browse_cheaper: 'Más baratos',
  browse_pricier: 'Más caros',
  browse: 'Browse',
  browse_more: 'Browse "más"',
  no_more: 'Sin más',
  text_search: 'Búsqueda libre',
  no_match: 'No match',
  ai: 'IA',
  fallback: 'Fallback (IA caída)',
};

function StatCard({ label, value, sub, accent = 'rose' }) {
  const accentColors = {
    rose:    'from-rose-50 to-rose-100/50 text-rose-700 border-rose-100',
    emerald: 'from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-100',
    amber:   'from-amber-50 to-amber-100/50 text-amber-700 border-amber-100',
    blue:    'from-blue-50 to-blue-100/50 text-blue-700 border-blue-100',
  };
  return (
    <div className={`rounded-2xl border p-4 bg-gradient-to-br ${accentColors[accent]}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-3xl font-display font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ChatInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!USE_API) { setLoading(false); setError('Backend no conectado'); return; }
    let cancelled = false;
    setLoading(true);
    api.get(`/chatbot/admin/insights?days=${days}`)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.error || 'Error cargando insights'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 leading-none">Insights del chatbot</h1>
          <p className="text-ink-400 text-sm mt-1">
            Qué te preguntan, qué encuentra y dónde están los huecos del catálogo.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-cream-200 rounded-xl p-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                days === d ? 'bg-rose-500 text-white' : 'text-ink-500 hover:text-ink-700'
              }`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-cream-100 p-4 h-24 bg-cream-50 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total queries" value={data.total.toLocaleString('es-CR')} sub={`Últimos ${data.days} días`} accent="rose" />
            <StatCard label="Resueltas" value={data.resolved.toLocaleString('es-CR')} sub={`${data.resolutionRate ?? '—'}% del total`} accent="emerald" />
            <StatCard label="Sin resolver" value={(data.total - data.resolved).toLocaleString('es-CR')} sub="Oportunidades de mejora" accent="amber" />
            <StatCard label="Top intent" value={data.byKind?.[0]?.kind ? KIND_LABEL[data.byKind[0].kind] || data.byKind[0].kind : '—'} sub={data.byKind?.[0] ? `${data.byKind[0].count} queries` : ''} accent="blue" />
          </div>

          {/* Top failed queries — el oro */}
          <section className="bg-white rounded-2xl border border-cream-100 overflow-hidden">
            <header className="px-5 py-4 border-b border-cream-100 flex items-center gap-2">
              <span className="text-amber-500">🔥</span>
              <div>
                <h2 className="font-bold text-ink-900">Queries que el bot NO pudo resolver</h2>
                <p className="text-xs text-ink-400">Cada una es una oportunidad: agregá un tag, un producto, o una sinónimo para que la próxima vez funcione.</p>
              </div>
            </header>
            {data.topFailed.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">¡Nadie quedó sin respuesta! 🎉</p>
            ) : (
              <div className="divide-y divide-cream-50">
                {data.topFailed.map((q, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-cream-50/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-800 truncate">"{q.text}"</p>
                      <p className="text-[10px] text-ink-400 uppercase tracking-wider mt-0.5">
                        {q.kinds.map((k) => KIND_LABEL[k] || k).join(' · ')}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100 flex-shrink-0">
                      {q.count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Top resolved queries — qué está funcionando */}
          <section className="bg-white rounded-2xl border border-cream-100 overflow-hidden">
            <header className="px-5 py-4 border-b border-cream-100 flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              <div>
                <h2 className="font-bold text-ink-900">Queries más populares (resueltas)</h2>
                <p className="text-xs text-ink-400">Lo que el bot está respondiendo bien. Útil para ver qué busca tu público.</p>
              </div>
            </header>
            {data.topResolved.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">Sin datos todavía.</p>
            ) : (
              <div className="divide-y divide-cream-50">
                {data.topResolved.map((q, i) => (
                  <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-4 hover:bg-cream-50/60">
                    <p className="text-sm text-ink-700 truncate flex-1">"{q.text}"</p>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 flex-shrink-0">
                      {q.count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Distribución por intent */}
          <section className="bg-white rounded-2xl border border-cream-100 overflow-hidden">
            <header className="px-5 py-4 border-b border-cream-100">
              <h2 className="font-bold text-ink-900">Distribución por tipo de respuesta</h2>
              <p className="text-xs text-ink-400">Qué caminos del bot se usan más.</p>
            </header>
            <div className="px-5 py-3 space-y-1.5">
              {data.byKind.map((k) => {
                const pct = data.total > 0 ? (k.count / data.total) * 100 : 0;
                return (
                  <div key={k.kind} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-ink-600 w-44 truncate">{KIND_LABEL[k.kind] || k.kind}</span>
                    <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-ink-500 w-12 text-right tabular-nums">{k.count}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
