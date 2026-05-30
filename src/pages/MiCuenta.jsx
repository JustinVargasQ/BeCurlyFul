import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useUserStore from '../store/userStore';
import api, { optimizedImage } from '../lib/api';
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
      <main className="min-h-screen pt-24 pb-28 sm:pb-20 bg-cream-50">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-rose-500 bg-rose-50 border border-rose-100">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 mb-2">Iniciá sesión</h1>
          <p className="text-sm text-ink-500 mb-6">Para ver tu cuenta y tus pedidos</p>
          <button onClick={() => setShowLogin(true)} className="btn-primary px-6 py-3 text-sm">
            Iniciar sesión con Google
          </button>
        </div>
        <LoginModal open={showLogin} onClose={() => { setShowLogin(false); if (!useUserStore.getState().user) navigate('/'); }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-28 sm:pb-20 bg-cream-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-soft border border-cream-200 p-5 sm:p-6 mb-6 flex items-center gap-4">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-cream-200" referrerPolicy="no-referrer" />
          ) : (
            <span className="w-16 h-16 rounded-full bg-rose-500 text-white text-xl font-display font-semibold flex items-center justify-center">
              {user.name?.split(' ').map((s) => s[0]).slice(0, 2).join('')}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="section-label !mb-1 !text-[10px]">Mi cuenta</p>
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink-900 truncate leading-tight">{user.name}</h1>
            <p className="text-sm text-ink-500 truncate">{user.email}</p>
          </div>
          <button onClick={() => { logout(); navigate('/'); }}
            className="text-xs sm:text-sm text-red-500 hover:text-red-600 font-semibold whitespace-nowrap self-start">
            Cerrar sesión
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { id: 'perfil',  label: 'Perfil' },
            { id: 'pedidos', label: `Mis pedidos${orders.length ? ` (${orders.length})` : ''}` },
          ].map((t) => (
            <button key={t.id}
              onClick={() => setSearchParams(t.id === 'perfil' ? {} : { tab: t.id })}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-rose-500 text-white shadow-btn'
                  : 'bg-white text-ink-600 hover:bg-cream-100 border border-cream-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'perfil' ? (
          <div className="bg-white rounded-3xl shadow-soft border border-cream-200 p-6 space-y-4">
            <h2 className="text-xs font-bold text-ink-400 uppercase tracking-widest">Datos de tu cuenta</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nombre" value={user.name} />
              <Field label="Email" value={user.email} />
            </div>
            <p className="text-[11px] text-ink-400 pt-3 border-t border-cream-200">
              Estos datos vienen de tu cuenta de Google.
            </p>
          </div>
        ) : (
          <div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="bg-white rounded-3xl border border-cream-200 h-40 animate-pulse" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-cream-200 p-10 text-center shadow-soft">
                <div className="w-14 h-14 rounded-full bg-rose-50 mx-auto mb-4 flex items-center justify-center text-rose-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <p className="font-display font-semibold text-ink-900 text-lg mb-1">Aún no tenés pedidos</p>
                <p className="text-sm text-ink-400 mb-5">Cuando hagas tu primera compra aparecerá acá.</p>
                <Link to="/" className="btn-primary px-6 py-2.5 text-sm">Ver productos</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => <OrderCard key={o._id} order={o} />)}
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
  const date = new Date(order.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });
  const items = order.items || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-cream-200 shadow-soft overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-cream-200">
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-bold text-rose-500 tracking-wide">{order.orderNumber}</p>
          <p className="text-xs text-ink-400 mt-0.5">{date}</p>
        </div>
        <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0 ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Productos con foto */}
      <div className="px-5 divide-y divide-cream-100">
        {items.map((it, i) => {
          const img = it.image || it.images?.[0] || '';
          const variants = it.selectedVariants && Object.keys(it.selectedVariants).length > 0
            ? Object.entries(it.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')
            : '';
          return (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-cream-100 border border-cream-200 flex-shrink-0">
                {img
                  ? <img src={optimizedImage(img, 120)} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full bg-cream-200" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink-900 leading-snug line-clamp-2">{it.name}</p>
                {variants && <p className="text-[11px] text-rose-600 font-semibold truncate mt-0.5">{variants}</p>}
                <p className="text-xs text-ink-400 mt-0.5">Cantidad: {it.qty}</p>
              </div>
              <p className="text-sm font-display font-semibold text-ink-900 flex-shrink-0 tabular-nums">{formatCRC(it.price * it.qty)}</p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-cream-200 flex items-center justify-between gap-3"
        style={{ background: 'linear-gradient(180deg, #FFFBF7 0%, #FCF4F7 100%)' }}>
        <div>
          <p className="text-[11px] text-ink-400">Total del pedido</p>
          <p className="font-display font-semibold text-ink-900 text-lg tabular-nums">{formatCRC(order.total)}</p>
        </div>
        <Link to={`/pedido/${order.orderNumber}`}
          className="inline-flex items-center gap-1.5 bg-white border border-rose-200 text-rose-600 hover:border-rose-400 hover:bg-rose-50 font-semibold text-sm px-4 py-2.5 rounded-full transition-colors">
          Ver seguimiento
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </div>
    </motion.div>
  );
}
