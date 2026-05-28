import { useState, useEffect } from 'react';
import api from '../../lib/api';
import useToastStore from '../../store/toastStore';
import { formatCRC } from '../../lib/currency';

const USE_API = import.meta.env.VITE_API_URL;

const DEFAULTS = {
  storeName: 'Be Curly Full CR',
  whatsapp: '50672125261',
  email: '',
  address: '',
  heroTitle: 'Belleza auténtica',
  heroSub: 'Productos para cabello rizado y cuidado capilar.',
  heroStyle: 'grid',
  shippingCostCorreos: 2500,
  shippingCostExpress: 4500,
  freeShippingFrom: 25000,
  bankInfo: '',
  sinpePhone: '',
  sinpeName: '',
  promoBanner: '',
  promoBannerActive: false,
  promoBannerColor: '#E879A0',
  notificationEmail: '',
  autoConfirmOrders: true,
};

const inputCls  = 'w-full border border-cream-200 rounded-xl px-4 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white';
const labelCls  = 'block text-[11px] font-bold text-ink-500 uppercase tracking-widest mb-1.5';
const sectionCls = 'bg-white rounded-2xl border border-cream-100 shadow-card p-5 sm:p-6 space-y-4';

/* SMTP/Resend diagnostic — admin puede verificar si el envio de emails
 * funciona, sin tocar consola ni env vars. */
function SmtpTester({ defaultTo }) {
  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [testTo, setTestTo]     = useState(defaultTo || '');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => { if (!status && !defaultTo) setTestTo(''); setTestTo(defaultTo || ''); }, [defaultTo]);

  const checkStatus = async () => {
    setLoading(true);
    setStatus(null);
    setTestResult(null);
    try {
      const { data } = await api.get('/orders/admin/smtp-status');
      setStatus(data);
    } catch (err) {
      setStatus({ ok: false, error: err.response?.data?.error || err.message });
    } finally { setLoading(false); }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return;
    setLoading(true);
    setTestResult(null);
    try {
      const { data } = await api.get(`/orders/admin/smtp-status?test=${encodeURIComponent(testTo.trim())}`);
      setStatus(data);
      setTestResult(data.testEmail || data);
    } catch (err) {
      setTestResult({ ok: false, error: err.response?.data?.error || err.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="border-t border-cream-100 pt-4 mt-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900">Probar envío de emails</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Diagnostica si SMTP / Resend está bien configurado.</p>
        </div>
        <button
          type="button"
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-cream-200 hover:border-rose-300 text-ink-700 hover:text-rose-600 bg-white transition-colors disabled:opacity-50">
          {loading ? 'Verificando…' : 'Verificar config'}
        </button>
      </div>

      {status && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          status.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <p className="font-semibold mb-1">
            {status.ok ? '✓' : '⚠'} {status.message || (status.ok ? 'Email funciona' : 'Email no configurado')}
          </p>
          {status.providerOrder && (
            <p className="text-xs">Orden de intento: <code className="bg-white/60 px-1 rounded">{status.providerOrder.join(' → ')}</code></p>
          )}
          {status.primary && (
            <p className="text-xs">Primario: <strong>{status.primary}</strong>{status.from && <> · From: <code className="bg-white/60 px-1 rounded">{status.from}</code></>}</p>
          )}
          {status.smtp?.user && <p className="text-xs">SMTP user: <code className="bg-white/60 px-1 rounded">{status.smtp.user}</code></p>}
          {status.smtp?.host && <p className="text-xs">Host: <code className="bg-white/60 px-1 rounded">{status.smtp.host}:{status.smtp.port}</code></p>}
          {status.smtp?.detail && <p className="text-xs mt-1 break-words"><strong>Error:</strong> {status.smtp.detail}</p>}
          {Array.isArray(status.howToFix) && (
            <ul className="text-[11px] mt-2 space-y-1 list-disc list-inside">
              {status.howToFix.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          )}
          {typeof status.howToFix === 'string' && (
            <p className="text-[11px] mt-2">{status.howToFix}</p>
          )}
        </div>
      )}

      {status?.ok && (
        <div className="flex gap-2">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="Email destino de prueba"
            className={inputCls + ' flex-1'} />
          <button
            type="button"
            onClick={sendTest}
            disabled={loading || !testTo.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-50 whitespace-nowrap">
            {loading ? 'Enviando…' : 'Enviar prueba'}
          </button>
        </div>
      )}

      {testResult && (
        <div className={`rounded-xl border px-4 py-2.5 text-xs ${
          testResult.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {testResult.ok
            ? <>✓ Email de prueba enviado a <strong>{testResult.to || testTo}</strong>. Revisá tu inbox (y spam por las dudas).</>
            : <>✗ Falló: {testResult.error || testResult.detail || 'error desconocido'}</>}
        </div>
      )}
    </div>
  );
}

export default function AdminConfig() {
  const toast = useToastStore();
  const [form, setForm]       = useState(DEFAULTS);
  const [loading, setLoading] = useState(Boolean(USE_API));
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);

  useEffect(() => {
    if (!USE_API) return;
    (async () => {
      try {
        const { data } = await api.get('/settings');
        const localHeroStyle = (typeof window !== 'undefined' ? localStorage.getItem('heroStyle') : null);
        setForm({ ...DEFAULTS, ...data, heroStyle: data?.heroStyle || localHeroStyle || DEFAULTS.heroStyle });
      } catch {
        toast.error('No se pudo cargar la configuración');
      } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => {
    const v = e.target.type === 'number' ? Number(e.target.value)
            : e.target.type === 'checkbox' ? e.target.checked
            : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!USE_API) {
      toast.error('Backend no conectado (VITE_API_URL).');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch('/settings', form);
      /* Preserve heroStyle even if backend doesn't return it (no schema support) */
      const finalHeroStyle = data?.heroStyle || form.heroStyle || DEFAULTS.heroStyle;
      setForm({ ...DEFAULTS, ...data, heroStyle: finalHeroStyle });
      /* Persist to localStorage so the home page can read it as backup */
      try { localStorage.setItem('heroStyle', finalHeroStyle); } catch {}
      setDirty(false);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-10 text-center text-ink-400">Cargando configuración...</div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 leading-none">Configuración</h1>
          <p className="text-ink-400 text-sm mt-1">Datos de tu tienda, envío y pagos</p>
        </div>
        <button type="submit" disabled={saving || !dirty}
          className="bg-rose-500 hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-btn">
          {saving ? 'Guardando...' : dirty ? 'Guardar cambios' : 'Sin cambios'}
        </button>
      </div>

      {!USE_API && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3 text-sm">
          Backend no conectado. Los cambios no se guardarán hasta configurar <code className="font-mono">VITE_API_URL</code>.
        </div>
      )}

      {/* Tienda */}
      <div className={sectionCls}>
        <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Datos de la tienda</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input value={form.storeName} onChange={set('storeName')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>WhatsApp</label>
            <input value={form.whatsapp} onChange={set('whatsapp')} className={inputCls} placeholder="50672125261" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="contacto@tienda.com" />
          </div>
          <div>
            <label className={labelCls}>Dirección</label>
            <input value={form.address} onChange={set('address')} className={inputCls} placeholder="San José, Costa Rica" />
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className={sectionCls}>
        <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Página principal</p>

        {/* Hero style selector */}
        <div>
          <label className={labelCls}>Estilo del hero</label>
          <div className="grid grid-cols-2 gap-3">
            {/* GRID option */}
            <button type="button"
              onClick={() => { setForm(f => ({ ...f, heroStyle: 'grid' })); setDirty(true); }}
              className={`relative rounded-2xl overflow-hidden border-2 p-3 text-left transition-all ${
                form.heroStyle === 'grid'
                  ? 'border-rose-500 bg-rose-50/50 shadow-md'
                  : 'border-cream-200 hover:border-rose-300 bg-white'
              }`}>
              {/* Mini preview */}
              <div className="aspect-[2/1] rounded-lg overflow-hidden bg-cream-100 mb-2.5 flex gap-1 p-1">
                <div className="flex-1 rounded-md bg-gradient-to-br from-rose-200 to-amber-100" />
                <div className="flex-1 grid grid-cols-2 gap-1">
                  <div className="rounded-md bg-rose-100" />
                  <div className="rounded-md bg-amber-100" />
                  <div className="rounded-md bg-cream-200" />
                  <div className="rounded-md bg-rose-200" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink-900 leading-tight">Grid editorial</p>
                  <p className="text-[10px] text-ink-400 mt-0.5">Foto + 4 categorías</p>
                </div>
                {form.heroStyle === 'grid' && (
                  <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
            </button>

            {/* VIDEO option */}
            <button type="button"
              onClick={() => { setForm(f => ({ ...f, heroStyle: 'video' })); setDirty(true); }}
              className={`relative rounded-2xl overflow-hidden border-2 p-3 text-left transition-all ${
                form.heroStyle === 'video'
                  ? 'border-rose-500 bg-rose-50/50 shadow-md'
                  : 'border-cream-200 hover:border-rose-300 bg-white'
              }`}>
              {/* Mini preview */}
              <div className="aspect-[2/1] rounded-lg overflow-hidden bg-cream-100 mb-2.5 flex gap-1 p-1">
                <div className="flex-1 rounded-md bg-cream-50 flex flex-col justify-center items-start px-2 gap-1">
                  <div className="w-4 h-1 rounded bg-rose-300" />
                  <div className="w-8 h-1.5 rounded bg-ink-300" />
                  <div className="w-6 h-1 rounded bg-ink-200" />
                </div>
                <div className="flex-1 rounded-md bg-gradient-to-br from-ink-700 to-rose-400 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-white/40 backdrop-blur flex items-center justify-center">
                      <svg width="6" height="6" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink-900 leading-tight">Video lateral</p>
                  <p className="text-[10px] text-ink-400 mt-0.5">Texto + video TikTok</p>
                </div>
                {form.heroStyle === 'video' && (
                  <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
            </button>
          </div>
          <p className="text-[11px] text-ink-400 mt-2">
            El estilo "Video" requiere que tengas un archivo en <code className="bg-cream-100 px-1 rounded text-rose-500">/public/videos/hero.mp4</code>
          </p>
        </div>

        <div>
          <label className={labelCls}>Título del hero</label>
          <input value={form.heroTitle} onChange={set('heroTitle')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Subtítulo del hero</label>
          <textarea value={form.heroSub} onChange={set('heroSub')} rows={2} className={inputCls + ' resize-none'} />
        </div>
      </div>

      {/* Envío */}
      <div className={sectionCls}>
        <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Envío</p>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Correos CR (₡)</label>
            <input type="number" min="0" value={form.shippingCostCorreos} onChange={set('shippingCostCorreos')} className={inputCls} />
            <p className="text-[11px] text-ink-400 mt-1">{formatCRC(form.shippingCostCorreos)}</p>
          </div>
          <div>
            <label className={labelCls}>Express (₡)</label>
            <input type="number" min="0" value={form.shippingCostExpress} onChange={set('shippingCostExpress')} className={inputCls} />
            <p className="text-[11px] text-ink-400 mt-1">{formatCRC(form.shippingCostExpress)}</p>
          </div>
          <div>
            <label className={labelCls}>Envío gratis desde (₡)</label>
            <input type="number" min="0" value={form.freeShippingFrom} onChange={set('freeShippingFrom')} className={inputCls} />
            <p className="text-[11px] text-ink-400 mt-1">{form.freeShippingFrom > 0 ? formatCRC(form.freeShippingFrom) : 'Desactivado'}</p>
          </div>
        </div>
      </div>

      {/* Pedidos */}
      <div className={sectionCls}>
        <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Pedidos</p>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900">Confirmar pedidos automáticamente</p>
            <p className="text-[11px] text-ink-400 mt-1">
              Los pedidos nuevos se marcan como <strong className="text-green-600">Confirmado</strong> al crearse.
              Si está desactivado, entran como <strong className="text-yellow-600">Pendiente</strong> para que los revisés a mano.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 pt-1">
            <span className="text-xs text-ink-500 font-medium">{form.autoConfirmOrders ? 'Activo' : 'Inactivo'}</span>
            <div className="relative">
              <input type="checkbox" checked={form.autoConfirmOrders} onChange={set('autoConfirmOrders')} className="sr-only" />
              <div aria-hidden
                className={`w-10 h-6 rounded-full transition-colors ${form.autoConfirmOrders ? 'bg-rose-500' : 'bg-ink-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoConfirmOrders ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Pagos */}
      <div className={sectionCls}>
        <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Información de pago</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Teléfono SINPE Móvil</label>
            <input type="tel" value={form.sinpePhone} onChange={set('sinpePhone')} className={inputCls}
              placeholder="8888-8888" />
            <p className="text-[11px] text-ink-400 mt-1.5">Aparece en el checkout cuando el cliente elige SINPE como método de pago.</p>
          </div>
          <div>
            <label className={labelCls}>Nombre del titular</label>
            <input type="text" value={form.sinpeName} onChange={set('sinpeName')} className={inputCls}
              placeholder="Nombre y apellidos del titular de la cuenta" />
            <p className="text-[11px] text-ink-400 mt-1.5">Como aparece registrado en el banco — el cliente lo necesita para confirmar.</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Notas adicionales (opcional)</label>
          <textarea value={form.bankInfo} onChange={set('bankInfo')} rows={3}
            className={inputCls + ' resize-none font-mono text-xs'}
            placeholder="Cuenta IBAN, otro banco, instrucciones extra..." />
          <p className="text-[11px] text-ink-400 mt-1">Usado en WhatsApp al confirmar el pedido (no en el checkout).</p>
        </div>
      </div>

      {/* Notificaciones */}
      <div className={sectionCls}>
        <div>
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Notificaciones por correo</p>
          <p className="text-xs text-ink-400 mt-1">Cuando llegue un pedido nuevo te mandamos un correo con todos los detalles.</p>
        </div>
        <div>
          <label className={labelCls}>Correo para recibir notificaciones</label>
          <input type="email" value={form.notificationEmail} onChange={set('notificationEmail')} className={inputCls}
            placeholder="tucorreo@gmail.com" />
          <p className="text-[11px] text-ink-400 mt-1.5">
            También necesitás configurar <code className="bg-cream-100 px-1 rounded text-rose-500">SMTP_USER</code> y{' '}
            <code className="bg-cream-100 px-1 rounded text-rose-500">SMTP_PASS</code> (o <code className="bg-cream-100 px-1 rounded text-rose-500">RESEND_API_KEY</code>) en Environment de Render.
          </p>
        </div>

        <SmtpTester defaultTo={form.notificationEmail} />
      </div>

      {/* Banner promocional */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Banner promocional</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-ink-500 font-medium">{form.promoBannerActive ? 'Activo' : 'Inactivo'}</span>
            <div className="relative">
              <input type="checkbox" checked={form.promoBannerActive} onChange={set('promoBannerActive')} className="sr-only" />
              <div aria-hidden
                className={`w-10 h-6 rounded-full transition-colors ${form.promoBannerActive ? 'bg-rose-500' : 'bg-ink-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.promoBannerActive ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </div>
          </label>
        </div>
        <div>
          <label className={labelCls}>Texto del banner</label>
          <input value={form.promoBanner} onChange={set('promoBanner')} className={inputCls}
            placeholder="Envio gratis en pedidos mayores a 25.000! Usa el cupon VERANO10" />
        </div>
        <div>
          <label className={labelCls}>Color de fondo</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.promoBannerColor} onChange={set('promoBannerColor')}
              className="w-10 h-10 rounded-lg border border-cream-200 cursor-pointer p-1 bg-white" />
            <input value={form.promoBannerColor} onChange={set('promoBannerColor')} className={inputCls + ' flex-1'} />
          </div>
        </div>
        {form.promoBanner && (
          <div className="rounded-xl overflow-hidden">
            <div className="flex items-center justify-center px-10 py-2.5 text-white text-sm font-medium text-center"
              style={{ background: form.promoBannerColor }}>
              {form.promoBanner}
            </div>
            <p className="text-[11px] text-ink-400 text-center mt-1">Vista previa</p>
          </div>
        )}
      </div>

      {dirty && (
        <div className="sticky bottom-4 bg-ink-900 text-white rounded-2xl px-5 py-3 flex items-center justify-between gap-3 shadow-xl">
          <span className="text-sm">Tenés cambios sin guardar</span>
          <button type="submit" disabled={saving}
            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-btn">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </form>
  );
}
