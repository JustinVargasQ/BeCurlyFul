import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { PRODUCTS } from '../../data/products';
import api from '../../lib/api';
import { formatCRC } from '../../lib/currency';

const USE_API = import.meta.env.VITE_API_URL;

/* ── Icons ── */
const DashIcon    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const ProductIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const OrderIcon   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>;
const CouponIcon  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V7H4v10h16v-5"/><path d="M4 12h16"/><circle cx="9" cy="12" r="0.5" fill="currentColor"/><circle cx="15" cy="12" r="0.5" fill="currentColor"/></svg>;
const ConfigIcon  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const ReviewIcon  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const MenuIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>;
const CloseIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const LogoutIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const StoreIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const BoxStatIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>;
const ShopBagIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const WalletIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
const ClockStatIcon= () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const AddStatIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const GlobeIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const ChatStatIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const GuideDocIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const GuideImgIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const GuideEyeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const GuideBoxIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>;

const NAV = [
  { to: '/admin',            label: 'Dashboard',    icon: <DashIcon />,    exact: true },
  { to: '/admin/productos',  label: 'Productos',    icon: <ProductIcon />              },
  { to: '/admin/ordenes',    label: 'Órdenes',      icon: <OrderIcon />                },
  { to: '/admin/cupones',    label: 'Cupones',      icon: <CouponIcon />               },
  { to: '/admin/resenas',    label: 'Reseñas',      icon: <ReviewIcon />               },
  { to: '/admin/chatbot',    label: 'Chatbot',      icon: <ChatStatIcon />             },
  { to: '/admin/config',     label: 'Configuración',icon: <ConfigIcon />               },
];

const PAGE_TITLES = {
  '/admin':                    'Dashboard',
  '/admin/productos/nuevo':    'Nuevo producto',
  '/admin/productos':          'Productos',
  '/admin/ordenes':            'Órdenes',
  '/admin/cupones':            'Cupones',
  '/admin/resenas':            'Reseñas',
  '/admin/chatbot':            'Chatbot',
  '/admin/config':             'Configuración',
};

const STATUS_LABELS = {
  pendiente:  { label: 'Pendiente',  dot: 'bg-yellow-400' },
  confirmado: { label: 'Confirmado', dot: 'bg-blue-400'   },
  preparando: { label: 'Preparando', dot: 'bg-purple-400' },
  enviado:    { label: 'Enviado',    dot: 'bg-orange-400' },
  entregado:  { label: 'Entregado',  dot: 'bg-green-400'  },
  cancelado:  { label: 'Cancelado',  dot: 'bg-red-400'    },
};

/* ── Stat card ── */
function StatCard({ icon, label, value, sub, accent = '#E879A0', bg = '#FFF0F7' }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-cream-100 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg, color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="font-display text-2xl font-bold leading-none" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[11px] text-ink-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Quick action card ── */
function QuickCard({ icon, label, sub, to, href, bg = 'bg-rose-50', hover = 'hover:bg-rose-100' }) {
  const cls = `flex items-center gap-3 p-4 ${bg} ${hover} rounded-xl transition-colors group`;
  const inner = (
    <>
      <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform text-ink-600">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-ink-900 text-sm">{label}</p>
        <p className="text-xs text-ink-400 mt-0.5">{sub}</p>
      </div>
    </>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  return <Link to={to} className={cls}>{inner}</Link>;
}

/* ── Recent orders list ── */
function RecentOrders({ orders, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-cream-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (!orders.length) {
    return <p className="text-sm text-ink-400 text-center py-8">Aún no hay órdenes.</p>;
  }
  return (
    <div className="divide-y divide-cream-100">
      {orders.slice(0, 5).map((o) => {
        const st = STATUS_LABELS[o.status] || { label: o.status, dot: 'bg-ink-400' };
        return (
          <Link key={o._id} to="/admin/ordenes"
            className="flex items-center gap-3 py-2.5 hover:bg-cream-50/60 -mx-2 px-2 rounded-lg transition-colors">
            <span className="font-mono font-bold text-rose-500 text-xs tracking-wide flex-shrink-0">{o.orderNumber}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900 truncate">{o.customer?.name}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </div>
            </div>
            <p className="font-bold text-ink-900 text-sm flex-shrink-0">{formatCRC(o.total)}</p>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Sales bar chart (SVG) ── */
function SalesChart({ data }) {
  if (!data?.length) return <p className="text-sm text-ink-400 text-center py-8">Sin datos aún.</p>;

  const thisWeek = data.slice(7);
  const prevWeek = data.slice(0, 7);
  const maxRev   = Math.max(...data.map((d) => d.revenue), 1);

  const prevTotal = prevWeek.reduce((s, d) => s + d.revenue, 0);
  const thisTotal = thisWeek.reduce((s, d) => s + d.revenue, 0);
  const pct       = prevTotal > 0 ? ((thisTotal - prevTotal) / prevTotal) * 100 : null;

  const weekLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const BAR_W = 28;
  const GAP   = 10;
  const H     = 80;
  const W     = thisWeek.length * (BAR_W + GAP) - GAP;

  return (
    <div className="space-y-3">
      {/* Week-over-week badge */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-400 font-medium">Últimos 7 días vs semana anterior</p>
        {pct !== null && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            pct >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
          </span>
        )}
      </div>
      {/* SVG bars */}
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full overflow-visible">
        {thisWeek.map((d, i) => {
          const barH  = Math.max(2, (d.revenue / maxRev) * H);
          const x     = i * (BAR_W + GAP);
          const y     = H - barH;
          const day   = new Date(d.date + 'T12:00:00');
          const label = weekLabels[day.getDay()];
          const prevD = prevWeek[i];
          const prevH = Math.max(2, (prevD.revenue / maxRev) * H);
          return (
            <g key={d.date}>
              {/* prev week ghost bar */}
              <rect x={x} y={H - prevH} width={BAR_W} height={prevH}
                rx="4" fill="#F3E8EC" />
              {/* this week bar */}
              <rect x={x} y={y} width={BAR_W} height={barH}
                rx="4" fill="#E879A0" />
              <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle"
                fontSize="9" fill="#9CA3AF">{label}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-3 text-[10px] text-ink-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" /> Esta semana</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-100 inline-block" /> Semana anterior</span>
      </div>
    </div>
  );
}

/* ── Top products list ── */
function TopProducts({ products, loading }) {
  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-cream-50 rounded-xl animate-pulse" />)}</div>;
  if (!products.length) return <p className="text-sm text-ink-400 text-center py-8">Sin datos de los últimos 30 días.</p>;

  const maxUnits = Math.max(...products.map((p) => p.units), 1);
  return (
    <div className="space-y-3">
      {products.map((p, i) => (
        <div key={p.name} className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-ink-300 w-4 flex-shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{p.name}</p>
            <div className="mt-1 h-1.5 bg-cream-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-400 rounded-full transition-all"
                style={{ width: `${(p.units / maxUnits) * 100}%` }} />
            </div>
          </div>
          <span className="text-xs text-ink-400 flex-shrink-0">{p.units} un.</span>
        </div>
      ))}
    </div>
  );
}

/* ── Low stock list ── */
function LowStock({ products }) {
  const low = products
    .filter((p) => p.isActive !== false && typeof p.stock === 'number' && p.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  if (!low.length) {
    return <p className="text-sm text-ink-400 text-center py-8">Todo el inventario está saludable.</p>;
  }
  return (
    <div className="divide-y divide-cream-100">
      {low.map((p) => (
        <Link key={p._id || p.id} to={`/admin/productos/${p._id || p.id}/editar`}
          className="flex items-center gap-3 py-2.5 hover:bg-cream-50/60 -mx-2 px-2 rounded-lg transition-colors">
          <div className="w-9 h-9 rounded-lg bg-cream-100 flex-shrink-0 flex items-center justify-center text-ink-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{p.name}</p>
            <p className="text-[11px] text-ink-400 truncate">{p.brand}</p>
          </div>
          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${
            p.stock === 0 ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'
          }`}>
            {p.stock === 0 ? 'Agotado' : `${p.stock} un.`}
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ── Guía de inicio ── */
function GuiaInicio() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('bcf_guia_ok') === '1');
  if (dismissed) return null;

  const pasos = [
    { n: '1', icon: <GuideDocIcon />, title: 'Crear el producto', desc: 'Ir a Productos → Nuevo producto. Ponele nombre, marca, categoría y precio.' },
    { n: '2', icon: <GuideImgIcon />, title: 'Subir las fotos',  desc: 'Guardá el producto primero y luego subí las fotos. La primera foto es la principal.' },
    { n: '3', icon: <GuideEyeIcon />, title: 'Activarlo',         desc: 'Activá el toggle "Mostrar en la tienda" para que las clientas puedan verlo.' },
    { n: '4', icon: <GuideBoxIcon />, title: 'Recibir pedidos',   desc: 'Los pedidos llegan aquí en Órdenes y también por WhatsApp directamente.' },
  ];

  return (
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="font-display text-base font-bold text-gray-900 mb-0.5">Guía rápida para cargar productos</h3>
          <p className="text-[12px] text-gray-500">Seguí estos 4 pasos para agregar un producto a la tienda.</p>
        </div>
        <button onClick={() => { localStorage.setItem('bcf_guia_ok', '1'); setDismissed(true); }}
          className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {pasos.map((p) => (
          <div key={p.n} className="bg-white rounded-xl p-4 border border-rose-100/60 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{p.n}</span>
              <span className="text-rose-400 flex items-center">{p.icon}</span>
            </div>
            <p className="text-[12px] font-bold text-gray-800 mb-1">{p.title}</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Link to="/admin/productos/nuevo"
          className="inline-flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Cargar primer producto
        </Link>
        <button onClick={() => { localStorage.setItem('bcf_guia_ok', '1'); setDismissed(true); }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Ya entendí, ocultar guía
        </button>
      </div>
    </div>
  );
}

/* ── Dashboard home page ── */
function DashboardHome({ adminName }) {
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const today    = new Date().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });

  const [stats, setStats]         = useState(null);
  const [orders, setOrders]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topProds, setTopProds]   = useState([]);
  const [loading, setLoading]     = useState(Boolean(USE_API));
  const [topLoading, setTopLoading] = useState(Boolean(USE_API));

  const fetchData = useCallback(async () => {
    if (!USE_API) { setProducts(PRODUCTS); setLoading(false); setTopLoading(false); return; }
    try {
      const [statsRes, ordersRes, productsRes, chartRes, topRes] = await Promise.all([
        api.get('/orders/admin/stats'),
        api.get('/orders/admin/all', { params: { limit: 5 } }),
        api.get('/products/admin/all'),
        api.get('/orders/admin/chart'),
        api.get('/orders/admin/top-products'),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data.orders || []);
      setProducts(productsRes.data.products || []);
      setChartData(chartRes.data || []);
      setTopProds(topRes.data || []);
    } catch {
      // keep defaults
    } finally { setLoading(false); setTopLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('jd:new-order', handler);
    return () => window.removeEventListener('jd:new-order', handler);
  }, [fetchData]);

  const productCount = USE_API ? products.length : PRODUCTS.length;
  const activeCount  = USE_API ? products.filter((p) => p.isActive !== false).length : PRODUCTS.length;
  const pending      = stats?.statusCounts?.pendiente || 0;

  return (
    <div className="space-y-6">
      {/* Guía de inicio */}
      <GuiaInicio />

      {/* Greeting */}
      <div className="bg-ink-900 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="relative z-10">
          <p className="text-white/50 text-sm mb-1">{greeting}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {adminName ? `Hola, ${adminName.split(' ')[0]}!` : '¡Bienvenida!'}
          </h1>
          <p className="text-white/35 text-xs mt-1 capitalize">{today}</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 w-fit">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/70 text-xs font-medium">Tienda activa</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<BoxStatIcon />} label="Productos"     value={productCount}
          sub={USE_API ? `${activeCount} activos` : 'En catálogo'} accent="#E879A0" bg="#FFF0F7" />
        <StatCard icon={<ShopBagIcon />} label="Pedidos hoy"   value={stats ? stats.todayOrders : (USE_API ? '...' : '—')}
          sub={stats ? `${stats.totalOrders} en total` : (USE_API ? 'Cargando' : 'Requiere backend')} accent="#3B82F6" bg="#EFF6FF" />
        <StatCard icon={<WalletIcon />} label="Ventas 7 días" value={stats ? formatCRC(stats.weekRevenue) : (USE_API ? '...' : '—')}
          sub="Últimos 7 días" accent="#16A34A" bg="#F0FDF4" />
        <StatCard icon={<ClockStatIcon />} label="Pendientes"    value={stats ? pending : (USE_API ? '...' : '—')}
          sub={pending > 0 ? 'Por atender' : 'Al día'} accent="#D97706" bg="#FFFBEB" />
      </div>

      {/* Sales chart + Top products */}
      {USE_API && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-card border border-cream-100 p-5 sm:p-6">
            <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-4">Ventas diarias</p>
            <SalesChart data={chartData} />
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-cream-100 p-5 sm:p-6">
            <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-4">Top productos (30 días)</p>
            <TopProducts products={topProds} loading={topLoading} />
          </div>
        </div>
      )}

      {/* Recent orders + Low stock */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-card border border-cream-100 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Últimas órdenes</p>
            <Link to="/admin/ordenes" className="text-xs text-rose-500 hover:text-rose-600 font-semibold">Ver todas →</Link>
          </div>
          {USE_API
            ? <RecentOrders orders={orders} loading={loading} />
            : <p className="text-sm text-ink-400 text-center py-8">Conectá el backend para ver órdenes.</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-cream-100 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Stock bajo</p>
            <Link to="/admin/productos" className="text-xs text-rose-500 hover:text-rose-600 font-semibold">Ver productos →</Link>
          </div>
          <LowStock products={products} />
        </div>
      </div>

      {/* Quick access */}
      <div className="bg-white rounded-2xl shadow-card border border-cream-100 p-5 sm:p-6">
        <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-4">Accesos rápidos</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <QuickCard icon={<AddStatIcon />} label="Nuevo producto"  sub="Agregar al catálogo" to="/admin/productos/nuevo" bg="bg-rose-50"  hover="hover:bg-rose-100" />
          <QuickCard icon={<GlobeIcon />}    label="Ver tienda"       sub="Abrir sitio público"  href="/" bg="bg-cream-50" hover="hover:bg-cream-100" />
          <QuickCard icon={<ChatStatIcon />} label="WhatsApp"         sub="Atender pedidos"       href="https://wa.me/50672125261" bg="bg-green-50" hover="hover:bg-green-100" />
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar nav content ── */
function SidebarContent({ location, onNavigate, onLogout, adminName }) {
  const initials = adminName
    ? adminName.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
    : 'JD';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-5 flex-shrink-0">
        <p className="font-display text-xl font-bold text-white">
          JD <span className="text-rose-400">Admin</span>
        </p>
        <p className="text-white/30 text-[11px] mt-0.5 uppercase tracking-widest">Panel de control</p>
      </div>

      <div className="h-px bg-white/6 mx-4 flex-shrink-0" />

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
        {NAV.map((item) => {
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} onClick={onNavigate}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-rose-500 text-white shadow-btn'
                  : 'text-white/50 hover:bg-white/6 hover:text-white'
              }`}>
              <span className="flex-shrink-0 opacity-90">{item.icon}</span>
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: view store + user + logout */}
      <div className="p-3 flex-shrink-0 space-y-1">
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-white/40 hover:bg-white/6 hover:text-white transition-all">
          <StoreIcon /> Ver tienda
        </a>
        <div className="h-px bg-white/6 my-1" />
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {initials}
          </div>
          <p className="text-white/60 text-xs truncate flex-1">{adminName || 'Administrador'}</p>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-white/40 hover:bg-red-500/15 hover:text-red-400 transition-all">
          <LogoutIcon /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/* ── Audio context — must be created after a user gesture to work in browsers ── */
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function playOrderSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // C5-E5-G5-C6 ascending chime, loud and clear
    const notes = [
      { freq: 523.25, t: 0.00, dur: 0.22 },
      { freq: 659.25, t: 0.13, dur: 0.22 },
      { freq: 783.99, t: 0.26, dur: 0.22 },
      { freq: 1046.5, t: 0.39, dur: 0.55 },
    ];
    notes.forEach(({ freq, t, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.7, now + t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
      osc.start(now + t);
      osc.stop(now + t + dur + 0.05);
    });
    // Shimmer layer
    [523.25, 1046.5].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq * 2;
      const t = i * 0.39;
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.18, now + t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.3);
      osc.start(now + t);
      osc.stop(now + t + 0.35);
    });
  } catch {}
}

function showNotification(customer, orderNumber) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification('Nuevo pedido recibido!', {
    body: `${customer} — #${orderNumber}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: orderNumber,
    requireInteraction: true,
  });
}

function showStockNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag,
  });
}

let _pendingOrders = 0;
function updateTabTitle(delta = 0) {
  _pendingOrders = Math.max(0, _pendingOrders + delta);
  const base = 'JD Admin';
  document.title = _pendingOrders > 0 ? `(${_pendingOrders}) Pedido nuevo! — ${base}` : base;
}

function useNewOrderAlert() {
  useEffect(() => {
    document.title = 'JD Admin';
    const unlock = () => { try { getAudioCtx(); } catch {} };
    document.addEventListener('click', unlock, { once: true });

    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) return () => document.removeEventListener('click', unlock);
    const token = useAuthStore.getState().token;
    if (!token) return () => document.removeEventListener('click', unlock);

    const es = new EventSource(`${apiUrl}/events?token=${token}`);

    es.addEventListener('new-order', (e) => {
      const data = JSON.parse(e.data);
      playOrderSound();
      showNotification(data.customer || 'Cliente', data.orderNumber);
      updateTabTitle(+1);
      useToastStore.getState().success(
        `Nuevo pedido de ${data.customer || 'cliente'}! #${data.orderNumber}`
      );
      window.dispatchEvent(new CustomEvent('jd:new-order', { detail: data }));
    });

    // Stock-bajo y agotado: alertas blandas (sin sonido) para que reabastezcas a tiempo.
    es.addEventListener('low-stock', (e) => {
      try {
        const data = JSON.parse(e.data);
        showStockNotification('⚠️ Stock bajo', `${data.name} — quedan ${data.stock}`, `low-${data.productId}`);
        useToastStore.getState().info?.(`⚠️ ${data.name} en stock bajo (${data.stock})`)
          ?? useToastStore.getState().success(`⚠️ ${data.name} en stock bajo (${data.stock})`);
        window.dispatchEvent(new CustomEvent('jd:low-stock', { detail: data }));
      } catch {}
    });

    es.addEventListener('out-of-stock', (e) => {
      try {
        const data = JSON.parse(e.data);
        showStockNotification('🛑 Producto agotado', `${data.name} — sin stock`, `out-${data.productId}`);
        useToastStore.getState().error?.(`🛑 ${data.name} agotado`)
          ?? useToastStore.getState().success(`🛑 ${data.name} agotado`);
        window.dispatchEvent(new CustomEvent('jd:out-of-stock', { detail: data }));
      } catch {}
    });

    // Reset tab title when window gets focus
    const onFocus = () => { _pendingOrders = 0; document.title = 'JD Admin'; };
    window.addEventListener('focus', onFocus);

    return () => {
      es.close();
      document.removeEventListener('click', unlock);
      window.removeEventListener('focus', onFocus);
      document.title = 'JD Admin';
    };
  }, []);
}

export default function AdminDashboard() {
  useNewOrderAlert();
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'granted'
  );
  const [notifAsking, setNotifAsking] = useState(false);

  const requestNotifPerm = async () => {
    setNotifAsking(true);
    try {
      let perm;
      if (typeof Notification.requestPermission === 'function') {
        perm = await new Promise((resolve) => {
          const result = Notification.requestPermission(resolve);
          if (result?.then) result.then(resolve);
        });
      }
      perm = perm || Notification.permission;
      setNotifPerm(perm);
      if (perm === 'granted') {
        setTimeout(() => {
          new Notification('Notificaciones activadas!', {
            body: 'Te avisaremos cuando llegue un pedido nuevo.',
            icon: '/icons/icon-192.png',
          });
        }, 300);
      }
    } catch {
      setNotifPerm(Notification.permission);
    } finally {
      setNotifAsking(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/admin/login'); };
  const isDashboardHome = location.pathname === '/admin';
  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path)
  )?.[1] ?? 'Admin';

  return (
    <div className="min-h-screen bg-[#F4F0EF] flex">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 xl:w-60 bg-ink-900 flex-shrink-0 flex-col fixed h-full z-20">
        <SidebarContent location={location} onLogout={handleLogout} adminName={admin?.name} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-ink-900 flex-col transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
          <p className="font-display text-xl font-bold text-white">JD <span className="text-rose-400">Admin</span></p>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-white/40 hover:text-white transition-colors">
            <CloseIcon />
          </button>
        </div>
        <SidebarContent
          location={location}
          onNavigate={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          adminName={admin?.name}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-56 xl:ml-60 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="bg-white border-b border-cream-200 px-4 sm:px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 text-ink-400 hover:text-ink-900 transition-colors">
            <MenuIcon />
          </button>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-ink-900 text-base sm:text-lg leading-none">{pageTitle}</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-ink-400">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Tienda activa
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white text-[11px] font-bold">
            {admin?.name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'JD'}
          </div>
        </header>

        {notifPerm !== 'granted' && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-3">
            <span className="text-xs text-blue-700 flex-1">
              Pedidos nuevos aparecen en el titulo de la pestana aunque estes en otra ventana.
              {notifPerm === 'default' && (
                <button onClick={requestNotifPerm} disabled={notifAsking}
                  className="ml-2 underline font-bold hover:text-blue-900 disabled:opacity-60">
                  {notifAsking ? 'Esperando...' : 'Activar notificaciones del sistema'}
                </button>
              )}
              {notifPerm === 'denied' && <span className="ml-2 text-blue-500">(Notificaciones bloqueadas en este navegador)</span>}
            </span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isDashboardHome ? <DashboardHome adminName={admin?.name} /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
