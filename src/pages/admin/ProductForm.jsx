import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { assetUrl } from '../../lib/api';
import { formatCRC } from '../../lib/currency';
import useToastStore from '../../store/toastStore';

const USE_API = import.meta.env.VITE_API_URL;
const CATEGORIES = [
  { value: 'maquillaje', label: 'Maquillaje' },
  { value: 'ojos',       label: 'Ojos'       },
  { value: 'labios',     label: 'Labios'     },
  { value: 'rostro',     label: 'Rostro'     },
  { value: 'skincare',   label: 'Skincare'   },
  { value: 'cabello',    label: 'Cabello'    },
];

const EMPTY = {
  name: '', slug: '', brand: '', category: 'maquillaje',
  price: '', oldPrice: '', description: '',
  features: [''], tags: [], images: [], stock: '',
  isActive: true, badge: '', badgeType: '', variants: [],
};

// Suggested tags for quick-add. Clicking adds them to the product. Shown as
// chip buttons under the tag input. Keep this list aligned with the chatbot's
// PRODUCT_TYPE_KEYWORDS / ACCESSORY_KEYWORDS / BUNDLE_KEYWORDS.
const TAG_SUGGESTIONS = {
  maquillaje: ['base','labial','sombra','rubor','iluminador','corrector','primer','polvo','mascara','delineador'],
  rostro:     ['base','rubor','iluminador','corrector','primer','polvo','bronzer'],
  labios:     ['labial','gloss','tinta','balsamo','pintalabios'],
  ojos:       ['sombra','mascara','delineador','pestañina'],
  skincare:   ['serum','crema','limpiador','tonico','hidratante','protector','solar','exfoliante','mascarilla','contorno','retinol','niacinamida','vitamina-c'],
  cabello:    ['shampoo','acondicionador','tratamiento','keratina'],
};
const TAG_SPECIAL = ['accesorio','kit','set','combo','oferta','vegano','natural','nuevo'];

function slugify(s = '') {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white';
const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5';

function SectionCard({ icon, title, action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center text-gray-400">{icon}</span>
          <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-rose-500' : 'bg-gray-200'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const toast = useToastStore();

  const [form, setForm]               = useState(EMPTY);
  const [loading, setLoading]         = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [uploading, setUploading]     = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileRef = useRef(null);
  const [restockReqs, setRestockReqs] = useState([]);

  useEffect(() => {
    if (!isEdit || !USE_API) return;
    api.get('/restock/admin/all')
      .then(({ data }) => {
        const mine = (data.requests || []).filter(
          (r) => String(r.product?._id || r.product) === id
        );
        setRestockReqs(mine);
      })
      .catch(() => {});
  }, [id, isEdit]);

  const notifyRestock = (req) => {
    const phone = req.phone.replace(/\D/g, '');
    const wa = phone.length === 8 ? '506' + phone : phone;
    const msg = `Hola! Te escribimos de JD Virtual. El producto *${req.productName}* que tenias en lista de espera ya volvio a estar disponible. Podés verlo aquí: ${window.location.origin}/producto/${form.slug}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
    api.patch(`/restock/admin/${req._id}`)
      .then(() => setRestockReqs((prev) => prev.map((r) => r._id === req._id ? { ...r, notified: true } : r)))
      .catch(() => {});
  };

  const removeRestock = (req) => {
    api.delete(`/restock/admin/${req._id}`)
      .then(() => setRestockReqs((prev) => prev.filter((r) => r._id !== req._id)))
      .catch(() => {});
  };

  useEffect(() => {
    if (!isEdit || !USE_API) return;
    (async () => {
      try {
        const { data } = await api.get('/products/admin/all');
        const found = (data.products || []).find((p) => (p._id || p.id) === id);
        if (found) {
          setForm({
            ...EMPTY, ...found,
            oldPrice: found.oldPrice ?? '',
            features: found.features?.length ? found.features : [''],
            tags: Array.isArray(found.tags) ? found.tags : [],
            variants: found.variants?.length ? found.variants : [],
          });
        } else { setError('Producto no encontrado'); }
      } catch { setError('No se pudo cargar el producto'); }
      finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setField = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    set(k, v);
    if (k === 'name' && !slugTouched) set('slug', slugify(v));
  };

  const setFeature = (idx, v) => { const arr = [...form.features]; arr[idx] = v; set('features', arr); };
  const addFeature    = () => set('features', [...form.features, '']);
  const removeFeature = (idx) => set('features', form.features.filter((_, i) => i !== idx));

  const normalizeTag = (s) =>
    String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const addTag = (raw) => {
    const tag = normalizeTag(raw);
    if (!tag || (form.tags || []).includes(tag)) return;
    set('tags', [...(form.tags || []), tag]);
  };
  const removeTag = (tag) => set('tags', (form.tags || []).filter((t) => t !== tag));
  const removeImage   = (idx) => set('images', form.images.filter((_, i) => i !== idx));

  const addVariant      = () => set('variants', [...(form.variants || []), { name: '', options: [''] }]);
  const removeVariant   = (vi) => set('variants', form.variants.filter((_, i) => i !== vi));
  const setVariantName  = (vi, v) => { const arr = [...form.variants]; arr[vi] = { ...arr[vi], name: v }; set('variants', arr); };
  const addVariantOption = (vi) => { const arr = [...form.variants]; arr[vi] = { ...arr[vi], options: [...arr[vi].options, ''] }; set('variants', arr); };
  const setVariantOption = (vi, oi, v) => { const arr = [...form.variants]; arr[vi].options[oi] = v; set('variants', arr); };
  const removeVariantOption = (vi, oi) => { const arr = [...form.variants]; arr[vi].options = arr[vi].options.filter((_, i) => i !== oi); set('variants', arr); };

  const uploadFiles = async (files) => {
    if (!files?.length) return;
    if (!isEdit) { setError('Guardá el producto primero para poder subir imágenes.'); return; }
    setUploading(true);
    const fd = new FormData();
    [...files].forEach((f) => fd.append('images', f));
    try {
      const { data } = await api.post(`/products/${id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('images', [...form.images, ...data.urls]);
      toast.success(`${data.urls.length} imagen${data.urls.length === 1 ? '' : 'es'} subida${data.urls.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir imágenes');
    } finally { setUploading(false); }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!USE_API) { setError('Backend no conectado (falta VITE_API_URL).'); return; }

    const payload = {
      name:        form.name.trim(),
      slug:        (form.slug || slugify(form.name)).trim(),
      brand:       form.brand.trim(),
      category:    form.category,
      price:       Number(form.price) || 0,
      oldPrice:    form.oldPrice === '' ? null : Number(form.oldPrice),
      description: form.description.trim(),
      features:    form.features.map((f) => f.trim()).filter(Boolean),
      tags:        (form.tags || []).map((t) => normalizeTag(t)).filter(Boolean),
      images:      form.images,
      variants:    (form.variants || []).filter((v) => v.name.trim()).map((v) => ({
        name: v.name.trim(),
        options: v.options.map((o) => o.trim()).filter(Boolean),
      })),
      stock:       form.stock === '' ? null : Number(form.stock),
      isActive:    form.isActive,
      badge:       form.badge.trim(),
      badgeType:   form.badgeType.trim(),
    };

    if (!payload.name || !payload.brand || payload.price <= 0) {
      setError('Nombre, marca y precio son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success('Cambios guardados');
        navigate('/admin/productos');
      } else {
        const { data } = await api.post('/products', payload);
        toast.success('Producto creado. Ahora podés agregarle imágenes.');
        navigate(`/admin/productos/${data._id}/editar`, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al guardar';
      setError(msg);
      toast.error(msg);
    } finally { setSaving(false); }
  };

  if (!USE_API) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mx-auto mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-gray-900 mb-2">Backend no conectado</h2>
        <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
          Configurá <code className="bg-gray-100 px-1.5 py-0.5 rounded text-rose-500 text-xs">VITE_API_URL</code> para crear y editar productos.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-8 h-8 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando producto...</p>
      </div>
    );
  }

  const discount = form.price && form.oldPrice ? Math.round((1 - form.price / form.oldPrice) * 100) : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link to="/admin/productos"
            className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
          </Link>
          <div>
            <p className="text-[11px] text-gray-400 font-medium mb-0.5">Panel de administración</p>
            <h1 className="font-display text-xl font-bold text-gray-900 leading-none">
              {isEdit ? 'Editar producto' : 'Nuevo producto'}
            </h1>
          </div>
          {isEdit && (
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ${form.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${form.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {form.isActive ? 'Activo' : 'Inactivo'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link to="/admin/productos"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-xl transition-colors text-sm shadow-sm flex items-center gap-2">
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                {isEdit ? 'Guardar cambios' : 'Crear producto'}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Información básica */}
          <SectionCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} title="Datos del producto">
            <div>
              <label className={labelCls}>Nombre del producto *</label>
              <input value={form.name} onChange={setField('name')}
                className={inputCls} placeholder="Ej: Paleta de sombras 35 colores" required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Marca *</label>
                <input value={form.brand} onChange={setField('brand')}
                  className={inputCls} placeholder="Ej: Beauty Creations" required />
              </div>
              <div>
                <label className={labelCls}>Categoría *</label>
                <select value={form.category} onChange={setField('category')}
                  className={inputCls + ' cursor-pointer'}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Descripción del producto</label>
              <textarea value={form.description} onChange={setField('description')} rows={4}
                className={inputCls + ' resize-none'} placeholder="Contá qué hace el producto, para qué tipo de piel es, qué resultado da..." />
            </div>

            {/* Opciones avanzadas — slug */}
            <div>
              <button type="button" onClick={() => setShowAdvanced((v) => !v)}
                className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Opciones avanzadas
              </button>
              {showAdvanced && (
                <div className="mt-3">
                  <label className={labelCls}>Link del producto (se genera automático)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs font-mono">/producto/</span>
                    <input
                      value={form.slug}
                      onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
                      className={inputCls + ' pl-20 font-mono text-xs'} placeholder="nombre-del-producto" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">No hace falta cambiarlo, se genera solo desde el nombre.</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Características */}
          <SectionCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>} title="Puntos clave del producto"
            action={
              <button type="button" onClick={addFeature}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Agregar punto
              </button>
            }>
            <p className="text-[11px] text-gray-400 -mt-1">Beneficios o características cortas que se muestran como lista en la tienda.</p>
            {form.features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <input value={f} onChange={(e) => setFeature(i, e.target.value)}
                    className={inputCls} placeholder={`Ej: Fórmula larga duración, vegano y cruelty-free...`} />
                </div>
                {form.features.length > 1 && (
                  <button type="button" onClick={() => removeFeature(i)}
                    className="w-9 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
            ))}
          </SectionCard>

          {/* Tags — alimenta al chatbot. Ej: serum, accesorio, kit, retinol */}
          <SectionCard
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
            title="Etiquetas para el asistente IA">
            <p className="text-[11px] text-gray-400 -mt-1">
              Ayudan al chatbot a recomendar este producto correctamente. Ej:
              <code className="mx-1 px-1 rounded bg-gray-100 text-gray-600">serum</code>,
              <code className="mx-1 px-1 rounded bg-gray-100 text-gray-600">accesorio</code>,
              <code className="mx-1 px-1 rounded bg-gray-100 text-gray-600">kit</code>.
              Si marcás algo como "accesorio" no aparece en búsquedas generales de su categoría.
            </p>

            {/* Chips de tags actuales */}
            {(form.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-100">
                    {t}
                    <button type="button" onClick={() => removeTag(t)}
                      className="hover:text-rose-800" aria-label={`Quitar ${t}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input para agregar tag manual */}
            <input
              className={inputCls}
              placeholder="Escribí un tag y dale Enter (ej: serum, retinol, vegano)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  if (e.target.value.trim()) {
                    addTag(e.target.value);
                    e.target.value = '';
                  }
                }
              }}
            />

            {/* Tags sugeridos por categoría */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Sugeridos para {form.category}</p>
              <div className="flex flex-wrap gap-1.5">
                {(TAG_SUGGESTIONS[form.category] || []).map((t) => {
                  const isOn = (form.tags || []).includes(t);
                  return (
                    <button key={t} type="button"
                      onClick={() => isOn ? removeTag(t) : addTag(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        isOn
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-600'
                      }`}>
                      {isOn ? '✓ ' : '+ '}{t}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1.5">Especiales</p>
              <div className="flex flex-wrap gap-1.5">
                {TAG_SPECIAL.map((t) => {
                  const isOn = (form.tags || []).includes(t);
                  return (
                    <button key={t} type="button"
                      onClick={() => isOn ? removeTag(t) : addTag(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        isOn
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                      }`}>
                      {isOn ? '✓ ' : '+ '}{t}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          {/* Variantes */}
          <SectionCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.5" fill="currentColor"/></svg>} title="Opciones del producto"
            action={
              <button type="button" onClick={addVariant}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Agregar grupo
              </button>
            }>
            {(!form.variants || form.variants.length === 0) && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">Si el producto viene en varios colores, tonos o tallas, agregá un grupo aquí.</p>
                <p className="text-[11px] text-gray-300 mt-1">Ej: grupo "Tono" con opciones Butter, Pink, Translucido...</p>
              </div>
            )}
            {(form.variants || []).map((v, vi) => (
              <div key={vi} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex gap-2 items-center bg-gray-50 px-3 py-2.5 border-b border-gray-100">
                  <input value={v.name} onChange={(e) => setVariantName(vi, e.target.value)}
                    placeholder="Nombre del grupo (ej: Color)"
                    className="flex-1 bg-transparent text-sm font-semibold text-gray-700 placeholder-gray-400 outline-none" />
                  <button type="button" onClick={() => removeVariant(vi)}
                    className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {v.options.map((opt, oi) => (
                    <div key={oi} className="flex gap-2">
                      <input value={opt} onChange={(e) => setVariantOption(vi, oi, e.target.value)}
                        placeholder={`Opción ${oi + 1} (ej: Rosa)`}
                        className={inputCls + ' flex-1 text-sm'} />
                      {v.options.length > 1 && (
                        <button type="button" onClick={() => removeVariantOption(vi, oi)}
                          className="w-9 rounded-xl text-gray-300 hover:text-red-400 transition-colors flex items-center justify-center">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addVariantOption(vi)}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 mt-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Opción
                  </button>
                </div>
              </div>
            ))}
          </SectionCard>

          {/* Restock */}
          {isEdit && restockReqs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                    Lista de espera — {restockReqs.length} persona{restockReqs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button type="button"
                  onClick={() => restockReqs.filter((r) => !r.notified).forEach((r, i) => setTimeout(() => notifyRestock(r), i * 600))}
                  className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                  Avisar a todos
                </button>
              </div>
              <div className="p-5 divide-y divide-amber-100">
                {restockReqs.map((r) => (
                  <div key={r._id} className="flex items-center gap-3 py-2.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.notified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.phone}</p>
                      <p className="text-[11px] text-gray-400">{r.notified ? 'Ya avisado' : 'Esperando aviso'} · {new Date(r.createdAt).toLocaleDateString('es-CR')}</p>
                    </div>
                    <button type="button" onClick={() => notifyRestock(r)} disabled={r.notified}
                      className="flex items-center gap-1.5 text-xs font-bold bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      {r.notified ? 'Avisado' : 'Avisar'}
                    </button>
                    <button type="button" onClick={() => removeRestock(r)}
                      className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Imágenes */}
          <SectionCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>} title="Fotos del producto"
            action={
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={!isEdit || uploading}
                className="text-xs font-bold flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors">
                {uploading ? (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                )}
                {uploading ? 'Subiendo...' : 'Subir fotos'}
              </button>
            }>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />

            {!isEdit && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-sm text-blue-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Podés agregar imágenes una vez creado el producto.
              </div>
            )}

            {form.images.length === 0 ? (
              <div
                onClick={() => isEdit && fileRef.current?.click()}
                className={`border-2 border-dashed border-gray-200 rounded-xl p-10 text-center ${isEdit ? 'cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-colors' : ''}`}>
                <div className="flex justify-center mb-2 text-gray-300">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <p className="text-sm text-gray-400">{isEdit ? 'Hacé clic para subir imágenes' : 'Sin imágenes todavía'}</p>
                <p className="text-[11px] text-gray-300 mt-1">JPG, PNG, WebP · máx 5 MB c/u</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {form.images.map((url, i) => (
                    <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                      <img src={assetUrl(url)} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          Principal
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  {isEdit && (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-rose-300 hover:bg-rose-50/30 transition-colors flex flex-col items-center justify-center gap-1 text-gray-300 hover:text-rose-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span className="text-[10px] font-medium">Agregar</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">La primera imagen es la principal.</p>
              </>
            )}
          </SectionCard>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">

          {/* Precio e inventario */}
          <SectionCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} title="Precio y stock">
            <div>
              <label className={labelCls}>Precio de venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₡</span>
                <input type="number" min="0" value={form.price} onChange={setField('price')}
                  className={inputCls + ' pl-7'} placeholder="12500" required />
              </div>
              {form.price > 0 && (
                <p className="text-sm font-bold text-rose-500 mt-1.5">{formatCRC(Number(form.price))}</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Precio anterior (para mostrar descuento)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs font-bold">₡</span>
                <input type="number" min="0" value={form.oldPrice} onChange={setField('oldPrice')}
                  className={inputCls + ' pl-7'} placeholder="Si tenía precio mayor, ponerlo aquí" />
              </div>
              {discount > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">−{discount}% descuento</span>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Cantidad disponible en inventario</label>
              <input type="number" min="0" value={form.stock} onChange={setField('stock')}
                placeholder="Dejalo vacío si no querés llevar control de stock" className={inputCls} />
            </div>

            <div className="flex items-center justify-between pt-2 pb-1">
              <div>
                <p className="text-sm font-semibold text-gray-700">Mostrar en la tienda</p>
                <p className="text-[11px] text-gray-400">Las clientas pueden verlo y comprarlo</p>
              </div>
              <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </SectionCard>

          {/* Etiqueta */}
          <SectionCard icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>} title="Etiqueta especial">
            <p className="text-[11px] text-gray-400 -mt-1">Aparece como un chip encima de la foto del producto en la tienda.</p>
            <div>
              <label className={labelCls}>Texto de la etiqueta</label>
              <input value={form.badge} onChange={setField('badge')} className={inputCls}
                placeholder="Ej: Top ventas, Nuevo, Oferta, Favorito..." />
            </div>
            <div>
              <label className={labelCls}>Color de la etiqueta</label>
              <select value={form.badgeType} onChange={setField('badgeType')} className={inputCls + ' cursor-pointer'}>
                <option value="">Rosado (normal)</option>
                <option value="new">Azul (Nuevo)</option>
                <option value="sale">Rojo (Oferta)</option>
                <option value="hot">Naranja (Destacado)</option>
              </select>
            </div>
            {form.badge && (
              <div className="pt-1">
                <p className="text-[11px] text-gray-400 mb-2">Así se va a ver:</p>
                <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  form.badgeType === 'new'  ? 'bg-blue-100 text-blue-700' :
                  form.badgeType === 'sale' ? 'bg-red-100 text-red-700' :
                  form.badgeType === 'hot'  ? 'bg-orange-100 text-orange-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {form.badge}
                </span>
              </div>
            )}
          </SectionCard>

          {/* Guardar (mobile) */}
          <button type="submit" disabled={saving}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm flex items-center justify-center gap-2 lg:hidden">
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </form>
  );
}
