import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useToastStore from '../../store/toastStore';

const StarFilled = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const StarEmpty = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-200">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => s <= rating ? <StarFilled key={s} /> : <StarEmpty key={s} />)}
    </div>
  );
}

function RatingPill({ value, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
        active ? 'bg-amber-400 text-white shadow-sm' : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
      }`}
    >
      {value === 0 ? 'Todas' : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className={active ? 'text-white' : 'text-amber-400'}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          {value}
        </>
      )}
      {count !== undefined && (
        <span className={`ml-0.5 text-[10px] font-bold ${active ? 'text-white/80' : 'text-ink-400'}`}>{count}</span>
      )}
    </button>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('pending');
  const [search, setSearch]       = useState('');
  const [ratingFilter, setRating] = useState(0);
  const [selected, setSelected]   = useState(new Set());
  const [bulkLoading, setBulk]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const { data } = await api.get('/product-reviews/admin/all', {
        params: { approved: tab === 'approved' ? 'true' : 'false' },
      });
      setReviews(data);
    } catch { setReviews([]); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try {
      await api.patch(`/product-reviews/admin/${id}/approve`);
      useToastStore.getState().success('Reseña aprobada');
      setReviews((prev) => prev.filter((r) => r._id !== id));
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    } catch { useToastStore.getState().error('Error al aprobar'); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/product-reviews/admin/${id}`);
      useToastStore.getState().success('Reseña eliminada');
      setReviews((prev) => prev.filter((r) => r._id !== id));
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    } catch { useToastStore.getState().error('Error al eliminar'); }
  };

  const bulkApprove = async () => {
    if (!selected.size) return;
    setBulk(true);
    let done = 0;
    for (const id of selected) {
      try {
        await api.patch(`/product-reviews/admin/${id}/approve`);
        done++;
      } catch { /* continue */ }
    }
    useToastStore.getState().success(`${done} reseña${done !== 1 ? 's' : ''} aprobada${done !== 1 ? 's' : ''}`);
    setSelected(new Set());
    await load();
    setBulk(false);
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    setBulk(true);
    let done = 0;
    for (const id of selected) {
      try {
        await api.delete(`/product-reviews/admin/${id}`);
        done++;
      } catch { /* continue */ }
    }
    useToastStore.getState().success(`${done} reseña${done !== 1 ? 's' : ''} eliminada${done !== 1 ? 's' : ''}`);
    setSelected(new Set());
    await load();
    setBulk(false);
  };

  /* ── Derived stats ── */
  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';

  const ratingCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) c[r.rating]++; });
    return c;
  }, [reviews]);

  /* ── Filtered list ── */
  const filtered = reviews.filter((r) => {
    const matchSearch = !search
      || r.authorName?.toLowerCase().includes(search.toLowerCase())
      || r.product?.name?.toLowerCase().includes(search.toLowerCase())
      || r.comment?.toLowerCase().includes(search.toLowerCase());
    const matchRating = ratingFilter === 0 || r.rating === ratingFilter;
    return matchSearch && matchRating;
  });

  const toggleSelect = (id) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(r => r._id)));

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 leading-none">Reseñas</h1>
          <p className="text-ink-400 text-sm mt-1">Moderación de valoraciones de productos</p>
        </div>
      </div>

      {/* Stats bar — only when there are reviews */}
      {!loading && reviews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold text-amber-700">{reviews.length}</span>
          </div>
          <div className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Promedio</span>
            <span className="text-xl font-bold text-ink-900 flex items-center gap-1">
              {avgRating}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">5 estrellas</span>
            <span className="text-xl font-bold text-green-700">{ratingCounts[5]}</span>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">1–2 estrellas</span>
            <span className="text-xl font-bold text-red-600">{(ratingCounts[1] || 0) + (ratingCounts[2] || 0)}</span>
          </div>
        </div>
      )}

      {/* Tabs + search + rating filter */}
      <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-4 space-y-3">
        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'pending',  label: 'Pendientes', emoji: '⏳' },
            { key: 'approved', label: 'Aprobadas',  emoji: '✅' },
          ].map(({ key, label, emoji }) => (
            <button key={key} onClick={() => { setTab(key); setSearch(''); setRating(0); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === key ? 'bg-ink-900 text-white' : 'bg-cream-50 border border-cream-200 text-ink-600 hover:bg-cream-100'
              }`}>
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por autor, producto o comentario..."
            className="w-full pl-9 pr-4 border border-cream-200 rounded-xl py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Rating filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider">Estrellas:</span>
          {[0, 5, 4, 3, 2, 1].map((v) => (
            <RatingPill
              key={v}
              value={v}
              active={ratingFilter === v}
              count={v === 0 ? undefined : ratingCounts[v]}
              onClick={() => setRating(ratingFilter === v ? 0 : v)}
            />
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-ink-900 rounded-2xl px-5 py-3 flex items-center justify-between gap-3 shadow-modal"
          >
            <span className="text-white font-semibold text-sm">
              {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              {tab === 'pending' && (
                <button
                  onClick={bulkApprove}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-full transition-colors disabled:opacity-50"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Aprobar todas
                </button>
              )}
              <button
                onClick={bulkDelete}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-full transition-colors disabled:opacity-50"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                Eliminar
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-white/60 hover:text-white text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-cream-100 p-5 flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-cream-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-cream-100 rounded w-1/4" />
                <div className="h-3 bg-cream-100 rounded w-full" />
                <div className="h-3 bg-cream-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-14 text-center">
          <div className="text-3xl mb-3">{reviews.length === 0 ? (tab === 'pending' ? '✅' : '⭐') : '🔍'}</div>
          <p className="text-ink-400 font-medium">
            {reviews.length === 0
              ? tab === 'pending' ? 'No hay reseñas pendientes.' : 'No hay reseñas aprobadas.'
              : 'Sin resultados para ese filtro.'}
          </p>
          {(search || ratingFilter !== 0) && (
            <button onClick={() => { setSearch(''); setRating(0); }}
              className="mt-3 text-xs text-rose-500 font-semibold hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Select all row */}
          <div className="flex items-center gap-3 px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-cream-300 text-rose-500 focus:ring-rose-400 cursor-pointer"
              />
              <span className="text-xs text-ink-400 font-medium group-hover:text-ink-700 transition-colors">
                Seleccionar todos ({filtered.length})
              </span>
            </label>
            {filtered.length !== reviews.length && (
              <span className="text-xs text-rose-500 font-medium">
                · {reviews.length - filtered.length} filtradas
              </span>
            )}
          </div>

          <div className="space-y-3">
            {filtered.map((r) => (
              <motion.div
                key={r._id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={`bg-white rounded-2xl border shadow-card p-5 transition-colors ${
                  selected.has(r._id) ? 'border-rose-200 bg-rose-50/30' : 'border-cream-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(r._id)}
                    onChange={() => toggleSelect(r._id)}
                    className="mt-1 w-4 h-4 rounded border-cream-300 text-rose-500 focus:ring-rose-400 cursor-pointer flex-shrink-0"
                  />

                  {/* Avatar — Google picture if available */}
                  {(r.authorAvatar || r.userId?.picture) ? (
                    <img src={r.authorAvatar || r.userId?.picture} alt={r.authorName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-cream-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center text-rose-600 font-bold text-sm flex-shrink-0">
                      {r.authorName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <p className="font-bold text-ink-900 text-sm">{r.authorName}</p>
                      {r.userId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full"
                          title="Verificado con Google">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                          Google
                        </span>
                      )}
                      <Stars rating={r.rating} />
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: r.rating >= 4 ? '#F0FDF4' : r.rating <= 2 ? '#FEF2F2' : '#FEFCE8',
                          color:      r.rating >= 4 ? '#15803D'  : r.rating <= 2 ? '#DC2626'  : '#A16207',
                        }}>
                        {r.rating}.0
                      </span>
                      <span className="text-[11px] text-ink-400">
                        {new Date(r.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {r.userId?.email && (
                      <p className="text-[11px] text-ink-400 mb-1 truncate">
                        ✉ {r.userId.email}
                      </p>
                    )}
                    {r.product && (
                      <p className="text-xs text-rose-500 font-semibold mb-1.5">📦 {r.product.name}</p>
                    )}
                    {r.comment && (
                      <p className="text-sm text-ink-600 leading-relaxed">"{r.comment}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tab === 'pending' && (
                      <button onClick={() => approve(r._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Aprobar
                      </button>
                    )}
                    <button onClick={() => remove(r._id)}
                      className="p-2 text-ink-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
