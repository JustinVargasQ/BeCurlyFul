import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { formatCRC } from '../lib/currency';
import SEO from '../components/ui/SEO';

const StepIconReceived = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
  </svg>
);
const StepIconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const StepIconBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>
  </svg>
);
const StepIconTruck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
    <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
  </svg>
);
const StepIconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const STEPS = [
  { key: 'pendiente',   label: 'Recibido',    Icon: StepIconReceived },
  { key: 'confirmado',  label: 'Confirmado',  Icon: StepIconCheck    },
  { key: 'preparando',  label: 'Preparando',  Icon: StepIconBox      },
  { key: 'enviado',     label: 'Enviado',     Icon: StepIconTruck    },
  { key: 'entregado',   label: 'Entregado',   Icon: StepIconHome     },
];

const STATUS_COLOR = {
  pendiente:  'text-yellow-600 bg-yellow-50 border-yellow-200',
  confirmado: 'text-blue-600 bg-blue-50 border-blue-200',
  preparando: 'text-purple-600 bg-purple-50 border-purple-200',
  enviado:    'text-indigo-600 bg-indigo-50 border-indigo-200',
  entregado:  'text-green-600 bg-green-50 border-green-200',
  cancelado:  'text-red-600 bg-red-50 border-red-200',
};

export default function OrderTracking() {
  const { number } = useParams();
  const navigate   = useNavigate();

  const [input,   setInput]   = useState(number || '');
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const search = async (e) => {
    e?.preventDefault();
    const num = input.trim().toUpperCase();
    if (!num) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const { data } = await api.get(`/orders/track/${num}`);
      setOrder(data);
      if (num !== number) navigate(`/pedido/${num}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Pedido no encontrado');
    } finally { setLoading(false); }
  };

  // Auto-search if number is in URL
  useState(() => { if (number && !order) search(); }, []);

  const currentStep = STEPS.findIndex((s) => s.key === order?.status);
  const isCancelled = order?.status === 'cancelado';

  return (
    <main className="min-h-screen pt-24 pb-20 px-4">
      <SEO title="Seguimiento de pedido" url="/pedido" noindex />
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-ink-900 mb-2">Seguimiento de pedido</h1>
          <p className="text-ink-400 text-sm">Ingresá tu número de orden para ver el estado</p>
        </div>

        {/* Search form */}
        <form onSubmit={search} className="flex gap-2 mb-8">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="JD-2025-0001"
            className="flex-1 border border-cream-200 rounded-xl px-4 py-3 text-ink-900 font-mono placeholder-ink-300 focus:outline-none focus:border-rose-400 transition-colors text-sm tracking-wider"
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm">
            {loading ? '...' : 'Buscar'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {order && (
          <div className="space-y-5">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs text-ink-400 font-semibold uppercase tracking-wider">Pedido</p>
                  <p className="font-mono font-bold text-ink-900 text-lg">{order.orderNumber}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full border capitalize ${STATUS_COLOR[order.status] || STATUS_COLOR.pendiente}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-ink-500">
                <span>Total: <strong className="text-ink-900">{formatCRC(order.total)}</strong></span>
                <span>·</span>
                <span>{new Date(order.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Stepper */}
            {!isCancelled ? (
              <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-5">
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-5">Estado del pedido</p>
                <div className="space-y-0">
                  {STEPS.map((step, i) => {
                    const done    = i < currentStep;
                    const active  = i === currentStep;
                    const pending = i > currentStep;
                    return (
                      <div key={step.key} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 transition-all ${
                            done    ? 'bg-green-500 border-green-500 text-white' :
                            active  ? 'bg-rose-500 border-rose-500 text-white' :
                                      'bg-white border-cream-200 text-ink-300'
                          }`}>
                            {done ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : <step.Icon />}
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={`w-0.5 h-6 my-0.5 ${done ? 'bg-green-300' : 'bg-cream-200'}`} />
                          )}
                        </div>
                        <div className={`pt-1 pb-4 ${pending ? 'opacity-40' : ''}`}>
                          <p className={`text-sm font-semibold ${active ? 'text-rose-500' : done ? 'text-green-600' : 'text-ink-400'}`}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                <p className="text-2xl mb-2">❌</p>
                <p className="font-semibold text-red-700">Pedido cancelado</p>
                <p className="text-sm text-red-600 mt-1">Contáctanos por WhatsApp si tenés alguna consulta.</p>
              </div>
            )}

            {/* WhatsApp */}
            <a href="https://wa.me/50688045100" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full border border-cream-200 hover:border-green-300 text-ink-700 hover:text-green-700 font-semibold px-5 py-3 rounded-xl transition-colors text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Consultar por WhatsApp
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
