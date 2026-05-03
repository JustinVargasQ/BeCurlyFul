import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useUserStore from '../store/userStore';
import api from '../lib/api';
import { formatCRC } from '../lib/currency';
import LoginModal from '../components/ui/LoginModal';

const STATUS = {
  pendiente:  { label: 'Pendiente',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmado: { label: 'Confirmado', color: 'bg-blue-50 text-blue-700 border-blue-200'      },
  preparando: { label: 'Preparando', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  enviado:    { label: 'Enviado',    color: 'bg-orange-50 text-orange-700 border-orange-200' },
  entregado:  { label: 'Entregado',  color: 'bg-green-50 text-green-700 border-green-200'   },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200'         },
};

export default function MiCuenta() {
  const user    = useUserStore((s) => s.user);
  const token   = useUserStore((s) => s.token);
  const logout  = useUserStore((s) => s.logout);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'perfil';

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    setLoading(true);
    api.get('/users/me/orders')
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) {
    return (
      <main className="min-h-screen pt-24 pb-20 bg-cream-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-rose-500"
            style={{ background: 'linear-gradient(135deg,rgba(184,95,114,.15),rgba(201,168,117,.1))', border: '1px solid rgba(184,95,114,.2)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">Iniciá sesión</h1>
          <p className="text-sm text-ink-500 mb-6">Para ver tu cuenta y tus pedidos</p>
          <button onClick={() => setShowLogin(true)}
            className="bg-ink-900 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-full transition-colors text-sm shadow-btn">
            Iniciar sesión con Google
          </button>
        </div>
        <LoginModal open={showLogin} onClose={() => { setShowLogin(false); if (!useUserStore.getState().user) navigate('/'); }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-20 bg-cream-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-card border border-cream-100 p-6 mb-6 flex items-center gap-4">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-cream-200" />
          ) : (
            <span className="w-16 h-16 rounded-full bg-rose-500 text-white text-xl font-bold flex items-center justify-center">
              {user.name?.split(' ').map((s) => s[0]).slice(0, 2).join('')}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink-900 truncate">{user.name}</h1>
            <p className="text-sm text-ink-500 truncate">{user.email}</p>
          </div>
          <button onClick={() => { logout(); navigate('/'); }}
            className="text-xs sm:text-sm text-red-500 hover:text-red-600 font-semibold whitespace-nowrap">
            Cerrar sesión
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {[
            { id: 'perfil',  label: 'Perfil' },
            { id: 'pedidos', label: `Pedidos${orders.length ? ` (${orders.length})` : ''}` },
          ].map((t) => (
            <button key={t.id}
              onClick={() => setSearchParams(t.id === 'perfil' ? {} : { tab: t.id })}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-ink-900 text-white shadow-btn'
                  : 'bg-white text-ink-600 hover:bg-cream-100 border border-cream-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'perfil' ? (
          <div className="bg-white rounded-3xl shadow-card border border-cream-100 p-6 space-y-4">
            <h2 className="text-xs font-bold text-ink-400 uppercase tracking-widest">Datos de tu cuenta</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nombre" value={user.name} />
              <Field label="Email" value={user.email} />
            </div>
            <p className="text-[11px] text-ink-400 pt-3 border-t border-cream-100">
              Estos datos vienen de tu cuenta de Google.
            </p>
          </div>
        ) : (
          <div>
            {loading ? (
              <div className="bg-white rounded-3xl border border-cream-100 p-10 text-center text-ink-400">
                Cargando pedidos...
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-cream-100 p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto mb-4 flex items-center justify-center text-ink-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>
                  </svg>
                </div>
                <p className="text-ink-700 font-semibold mb-1">Aún no tenés pedidos</p>
                <p className="text-sm text-ink-400 mb-5">Cuando hagas tu primera compra aparecerá acá.</p>
                <Link to="/" className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-full transition-colors text-sm">
                  Ver productos →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <OrderCard key={o._id} order={o} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-ink-900 font-medium">{value}</p>
    </div>
  );
}

function OrderCard({ order }) {
  const cfg = STATUS[order.status] || { label: order.status, color: 'bg-ink-100 text-ink-600 border-ink-200' };
  const date = new Date(order.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
  const itemCount = order.items?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-cream-100 shadow-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="font-mono text-sm font-bold text-rose-500 tracking-wide">{order.orderNumber}</p>
          <p className="text-xs text-ink-400 mt-0.5">{date}</p>
        </div>
        <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-cream-100">
        <p className="text-sm text-ink-700">
          <strong>{itemCount}</strong> {itemCount === 1 ? 'producto' : 'productos'} ·{' '}
          <strong className="text-ink-900">{formatCRC(order.total)}</strong>
        </p>
        <Link to={`/pedido/${order.orderNumber}`}
          className="text-xs text-rose-500 hover:text-rose-600 font-semibold">
          Ver detalle →
        </Link>
      </div>
    </motion.div>
  );
}
