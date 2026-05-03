import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useToastStore from '../../store/toastStore';
import { formatCRC } from '../../lib/currency';

const USE_API = import.meta.env.VITE_API_URL;

const TYPE_LABELS = {
  percent:  { label: 'Porcentaje',    tag: 'bg-rose-50 text-rose-600',    desc: (v) => `-${v}% del subtotal` },
  fixed:    { label: 'Monto fijo',    tag: 'bg-blue-50 text-blue-600',    desc: (v) => `-${formatCRC(v)}` },
  shipping: { label: 'Envío gratis',  tag: 'bg-green-50 text-green-700',  desc: () => 'Envío 100% gratis' },
};

const emptyForm = { code: '', type: 'percent', value: 10, description: '', minOrder: 0, maxUses: 0, expiresAt: '' };

function toIsoDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  // datetime-local needs YYYY-MM-DDTHH:MM in local time
  const offset = dt.getTimezoneOffset() * 60000;
  return new Date(dt - offset).toISOString().slice(0, 16);
}

const STATUS_FILTERS = [
  { key: 'todos',    label: 'Todos'    },
  { key: 'activos',  label: 'Activos'  },
  { key: 'vencidos', label: 'Vencidos' },
  { key: 'agotados', label: 'Agotados' },
  { key: 'inactivos',label: 'Inactivos'},
];

const ADJECTIVES = ['SUPER','MEGA','ULTRA','VIP','PROMO','SALE','DEAL'];
const generateCode = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${adj}${num}`;
};

export default function AdminCoupons() {
  const [coupons, setCoupons]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [usesModal, setUsesModal] = useState(null);
  const [usesLoading, setUsesLoading] = useState(false);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('todos');
  const toast      = useToastStore();
  const askConfirm = useToastStore((s) => s.askConfirm);

  const load = useCallback(async () => {
    if (!USE_API) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/coupons/admin/all');
      setCoupons(data.coupons || []);
    } catch {
      setCoupons([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      description: c.description || '',
      minOrder: c.minOrder || 0,
      maxUses: c.maxUses || 0,
      expiresAt: toIsoDateTime(c.expiresAt),
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!USE_API) return;
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.type === 'shipping' ? 0 : Number(form.value) || 0,
        description: form.description.trim(),
        minOrder: Number(form.minOrder) || 0,
        maxUses: Number(form.maxUses) || 0,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };

      if (editing) {
        const { data } = await api.put(`/coupons/${editing._id}`, body);
        setCoupons((cs) => cs.map((c) => (c._id === data._id ? data : c)));
        toast.success('Cupón actualizado');
      } else {
        const { data } = await api.post('/coupons', body);
        setCoupons((cs) => [data, ...cs]);
        toast.success('Cupón creado');
      }
      closeForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el cupón');
    } finally { setSaving(false); }
  };

  const toggle = async (id) => {
    if (!USE_API) return;
    try {
      const { data } = await api.patch(`/coupons/${id}/toggle`);
      setCoupons((cs) => cs.map((c) => (c._id === id ? data : c)));
      toast.success(data.isActive ? 'Cupón activado' : 'Cupón desactivado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const openUses = async (c) => {
    setUsesLoading(true);
    setUsesModal({ code: c.code, orders: [] });
    try {
      const { data } = await api.get(`/coupons/admin/${c._id}/uses`);
      setUsesModal({ code: data.code, orders: data.orders });
    } catch {
      setUsesModal({ code: c.code, orders: [] });
    } finally { setUsesLoading(false); }
  };

  const remove = async (c) => {
    const ok = await askConfirm({
      title: 'Eliminar cupón',
      message: `¿Eliminar el cupón "${c.code}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/coupons/${c._id}`);
      setCoupons((cs) => cs.filter((x) => x._id !== c._id));
      toast.success('Cupón eliminado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const inputCls = 'w-full border border-cream-200 rounded-xl px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white';

  /* ── Derived stats ── */
  const totalUses    = coupons.reduce((s, c) => s + (c.usedCount || 0), 0);
  const activeCount  = coupons.filter((c) => c.isActive && !(c.expiresAt && new Date(c.expiresAt) < new Date()) && !(c.maxUses > 0 && c.usedCount >= c.maxUses)).length;
  const expiredCount = coupons.filter((c) => c.expiresAt && new Date(c.expiresAt) < new Date()).length;

  /* ── Filtered list ── */
  const filtered = coupons.filter((c) => {
    const expired  = c.expiresAt && new Date(c.expiresAt) < new Date();
    const used     = c.maxUses > 0 && c.usedCount >= c.maxUses;
    const matchQ   = !search || c.code.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase());
    const matchS   =
      statusFilter === 'todos'     ? true
      : statusFilter === 'activos'  ? (c.isActive && !expired && !used)
      : statusFilter === 'vencidos' ? expired
      : statusFilter === 'agotados' ? used
      : statusFilter === 'inactivos'? !c.isActive
      : true;
    return matchQ && matchS;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 leading-none">Cupones</h1>
          <p className="text-ink-400 text-sm mt-1">
            {coupons.length === 0 ? 'Creá tu primer cupón' : `${activeCount} activos · ${coupons.length} en total`}
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-btn whitespace-nowrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo cupón
        </button>
      </div>

      {/* Mini stats bar */}
      {!loading && coupons.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Activos</span>
            <span className="text-xl font-bold text-green-700">{activeCount}</span>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Vencidos</span>
            <span className="text-xl font-bold text-red-600">{expiredCount}</span>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Usos totales</span>
            <span className="text-xl font-bold text-blue-700">{totalUses}</span>
          </div>
        </div>
      )}

      {/* Search + status filter */}
      {!loading && coupons.length > 0 && (
        <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-4 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o descripción..."
              className="w-full pl-9 pr-4 border border-cream-200 rounded-xl py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider mr-1">Estado:</span>
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setStatus(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                  statusFilter === f.key ? 'bg-rose-500 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                }`}>
                {f.label}
              </button>
            ))}
            {(search || statusFilter !== 'todos') && (
              <button onClick={() => { setSearch(''); setStatus('todos'); }}
                className="ml-auto text-xs text-ink-400 hover:text-rose-500 font-semibold transition-colors flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {!USE_API && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
          Los cupones requieren el backend activo (VITE_API_URL).
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-cream-100 animate-pulse" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-400 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V7H4v10h16v-5"/><path d="M4 12h16"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/></svg>
          </div>
          <h3 className="font-display text-lg font-bold text-ink-900 mb-1">Aún no hay cupones</h3>
          <p className="text-sm text-ink-400 mb-5">Creá uno para ofrecer descuentos en el checkout.</p>
          <button onClick={openCreate}
            className="bg-ink-900 hover:bg-rose-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            Crear primer cupón
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-10 text-center">
          <div className="flex justify-center mb-3 text-ink-300">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <p className="text-ink-400 font-medium">No hay cupones con ese filtro.</p>
          <button onClick={() => { setSearch(''); setStatus('todos'); }}
            className="mt-3 text-xs text-rose-500 font-semibold hover:underline">Limpiar filtros</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const info    = TYPE_LABELS[c.type] || TYPE_LABELS.percent;
            const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
            const used    = c.maxUses > 0 && c.usedCount >= c.maxUses;
            const disabled = !c.isActive || expired || used;

            return (
              <div key={c._id}
                className={`bg-white rounded-2xl border border-cream-100 shadow-card p-4 flex flex-col gap-3 ${disabled ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-bold text-ink-900 tracking-wider">{c.code}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${info.tag}`}>{info.label}</span>
                      {!c.isActive && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-500">Inactivo</span>}
                      {expired && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Vencido</span>}
                      {used && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Agotado</span>}
                    </div>
                    <p className="text-sm font-semibold text-ink-700 mt-1">{info.desc(c.value)}</p>
                    {c.description && <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">{c.description}</p>}
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => openUses(c)} title="Ver usos"
                      className="p-2 text-ink-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </button>
                    <button onClick={() => toggle(c._id)} title={c.isActive ? 'Desactivar' : 'Activar'}
                      className={`p-2 rounded-lg transition-colors ${c.isActive ? 'text-green-600 hover:bg-green-50' : 'text-ink-400 hover:bg-ink-100'}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={c.isActive ? 'M20 6 9 17l-5-5' : 'M18 6 6 18M6 6l12 12'}/></svg>
                    </button>
                    <button onClick={() => openEdit(c)} title="Editar"
                      className="p-2 text-ink-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => remove(c)} title="Eliminar"
                      className="p-2 text-ink-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] pt-3 border-t border-cream-100">
                  <div>
                    <p className="text-ink-400 uppercase tracking-wider font-semibold">Usos</p>
                    <p className="text-ink-900 font-bold mt-0.5">{c.usedCount}{c.maxUses > 0 ? ` / ${c.maxUses}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-ink-400 uppercase tracking-wider font-semibold">Mín. pedido</p>
                    <p className="text-ink-900 font-bold mt-0.5">{c.minOrder > 0 ? formatCRC(c.minOrder) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-ink-400 uppercase tracking-wider font-semibold">Vence</p>
                    <p className="text-ink-900 font-bold mt-0.5">{c.expiresAt ? new Date(c.expiresAt).toLocaleString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal usos */}
      <AnimatePresence>
        {usesModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setUsesModal(null)}
            className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-5 border-b border-cream-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-900">Usos del cupón <span className="font-mono text-rose-500">{usesModal.code}</span></h3>
                  <p className="text-xs text-ink-400 mt-0.5">{usesLoading ? 'Cargando...' : `${usesModal.orders.length} pedido${usesModal.orders.length !== 1 ? 's' : ''}`}</p>
                </div>
                <button onClick={() => setUsesModal(null)} className="p-1.5 text-ink-400 hover:text-ink-900 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                {usesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-cream-50 rounded-xl animate-pulse" />)}
                  </div>
                ) : usesModal.orders.length === 0 ? (
                  <div className="text-center py-10 text-ink-400 text-sm">Nadie ha usado este cupón todavía.</div>
                ) : (
                  <div className="space-y-2">
                    {usesModal.orders.map((o) => (
                      <div key={o._id} className="bg-cream-50 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900 truncate">{o.customer?.name}</p>
                          <p className="text-xs text-ink-400">{o.customer?.phone} · #{o.orderNumber}</p>
                          <p className="text-xs text-ink-400">{new Date(o.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-ink-900">{formatCRC(o.total)}</p>
                          <p className="text-xs text-green-600">−{formatCRC(o.discount || o.coupon?.discount || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeForm}
            className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0,  opacity: 1, scale: 1 }}
              exit={{    y: 40, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-cream-100 flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-ink-900">
                  {editing ? 'Editar cupón' : 'Nuevo cupón'}
                </h3>
                <button type="button" onClick={closeForm}
                  className="p-1.5 text-ink-400 hover:text-ink-900 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-ink-500 uppercase tracking-wide">Código *</label>
                    <button type="button"
                      onClick={() => setForm((f) => ({ ...f, code: generateCode() }))}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-600 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                      Auto-generar
                    </button>
                  </div>
                  <input required value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="PRIMERACOMPRA"
                    maxLength={20}
                    className={`${inputCls} font-mono tracking-wider uppercase`} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">Tipo de descuento *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(TYPE_LABELS).map(([key, info]) => (
                      <button key={key} type="button"
                        onClick={() => setForm((f) => ({ ...f, type: key }))}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          form.type === key
                            ? 'border-rose-400 bg-rose-50 text-rose-600'
                            : 'border-cream-200 text-ink-500 hover:border-rose-200'
                        }`}>
                        {info.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.type !== 'shipping' && (
                  <div>
                    <label className="block text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">
                      {form.type === 'percent' ? 'Porcentaje (%)' : 'Monto fijo (CRC)'} *
                    </label>
                    <input required type="number" min="0" max={form.type === 'percent' ? 100 : undefined}
                      value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                      placeholder={form.type === 'percent' ? '10' : '2000'}
                      className={inputCls} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">Descripción</label>
                  <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Primera compra (se ve en el checkout)"
                    className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">Pedido mínimo</label>
                    <input type="number" min="0" value={form.minOrder}
                      onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
                      placeholder="0 = sin mínimo"
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">Máx. usos</label>
                    <input type="number" min="0" value={form.maxUses}
                      onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                      placeholder="0 = ilimitado"
                      className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-500 uppercase tracking-wide mb-1.5">Fecha de vencimiento</label>
                  <input type="datetime-local" value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className={inputCls} />
                  <p className="text-[11px] text-ink-400 mt-1">Dejalo vacío si no vence.</p>
                </div>
              </div>

              <div className="p-6 border-t border-cream-100 flex gap-3">
                <button type="button" onClick={closeForm}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-ink-600 hover:bg-cream-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50">
                  {saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear cupón')}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
