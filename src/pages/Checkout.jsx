import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useCart from '../hooks/useCart';
import { formatCRC } from '../lib/currency';
import { buildWhatsAppMessage } from '../lib/whatsapp';
import MapAddressPicker from '../components/ui/MapAddressPicker';
import api, { optimizedImage } from '../lib/api';
import { trackBeginCheckout, trackPurchase } from '../lib/analytics';
import useUserStore from '../store/userStore';

const USE_API   = import.meta.env.VITE_API_URL;
const MAPS_KEY  = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const PLACE_ID  = 'ChIJozibdVQxoI8R8UWRnLA1T6w';
const PROVINCES = ['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón'];
const ShipBoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>
  </svg>
);
const ShipBoltIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const ShipHomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const SHIPPING  = {
  correos: { label: 'Correos de CR',         sub: '3-5 días hábiles',             price: 2500, Icon: ShipBoxIcon  },
  express: { label: 'Express Puntarenas',    sub: 'Mismo día / día siguiente',    price: 1500, Icon: ShipBoltIcon },
  retiro:  { label: 'Retiro en El Roble',    sub: 'Gratis · Lun–Sáb 9am–7pm',    price: 0,    Icon: ShipHomeIcon },
};
const SINPE_NUMBER = '8673-7114';
const SINPE_NAME   = 'Justin Vargas Quiros';
const isPickup = (s) => s === 'retiro';

/* ── Field icons ── */
const UserIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const PhoneIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const MailIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const MapPinIcon= () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const NoteIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const WaIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

/* ── Validation ── */
const formatPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`;
};

const validators = {
  name: (v) => {
    if (!v.trim()) return 'El nombre es requerido';
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s''-]+$/.test(v)) return 'Solo letras y espacios (sin números)';
    if (v.trim().length < 3) return 'Mínimo 3 caracteres';
    if (v.trim().split(/\s+/).filter(Boolean).length < 2) return 'Ingresá nombre y apellido';
    return '';
  },
  phone: (v) => {
    const d = v.replace(/\D/g, '');
    if (!d) return 'El teléfono es requerido';
    if (d.length !== 8) return 'Debe tener 8 dígitos';
    if (!/^[2678]/.test(d)) return 'Número CR inválido (empieza con 2, 6, 7 u 8)';
    return '';
  },
  email: (v) => {
    if (!v) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Correo electrónico inválido';
    return '';
  },
  address: (v, shipping) => {
    if (isPickup(shipping)) return '';
    if (!v.trim()) return 'La dirección es requerida';
    if (v.trim().length < 8) return 'Ingresá una dirección más completa';
    return '';
  },
  notes: (v) => v.length > 300 ? 'Máximo 300 caracteres' : '',
};

/* ── Field wrapper with icon + error ── */
function Field({ label, required, hint, error, touched, icon, children }) {
  const hasError = touched && error;
  const isOk     = touched && !error;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-ink-600 uppercase tracking-wide flex items-center gap-1">
          {label}
          {required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-ink-400">{hint}</span>}
      </div>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none z-10">
            {icon}
          </span>
        )}
        <div className={icon ? '[&_input]:pl-10 [&_textarea]:pl-10 [&_select]:pl-10' : ''}>
          {children}
        </div>
        {isOk && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        )}
      </div>
      <AnimatePresence>
        {hasError && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1 font-medium">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Section card ── */
function Section({ step, Icon, title, sub, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-cream-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-rose-500"
          style={{ background: 'linear-gradient(135deg,rgba(184,95,114,.12),rgba(201,168,117,.08))', border:'1px solid rgba(184,95,114,.18)' }}>
          {Icon ? <Icon /> : null}
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-ink-900 leading-tight">{title}</h2>
          {sub && <p className="text-[11px] text-ink-400 mt-0.5">{sub}</p>}
        </div>
        <span className="ml-auto text-xs font-bold text-ink-300">{step}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const SectionUserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const SectionTruckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
    <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
  </svg>
);
const SectionPayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);

const inputBase = 'w-full border rounded-xl px-4 py-3 text-ink-900 placeholder-ink-300 focus:outline-none transition-all bg-white text-sm';
const inputOk   = `${inputBase} border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100`;
const inputErr  = `${inputBase} border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100`;
const inputDef  = `${inputBase} border-cream-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100`;

function inputCls(touched, error) {
  if (!touched) return inputDef;
  return error ? inputErr : inputOk;
}

export default function Checkout() {
  const {
    items, total, clearCart,
    couponCode: cartCouponCode,
    couponDiscount: cartCouponDiscount,
    couponDesc: cartCouponDesc,
    couponType: cartCouponType,
    clearCoupon: clearCartCoupon,
  } = useCart();

  const navigate  = useNavigate();
  const user      = useUserStore((s) => s.user);
  const [shipping, setShipping] = useState('correos');
  const [form, setForm] = useState({
    name:  user?.name  || '',
    phone: '',
    email: user?.email || '',
    province: 'Puntarenas',
    address: '',
    notes: '',
    lat: null,
    lng: null,
  });

  /* Auto-fill when user logs in mid-checkout */
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name:  f.name  || user.name  || '',
      email: f.email || user.email || '',
    }));
  }, [user]);

  /* Abandoned cart recovery — cuando hay email valido + items en carrito,
   * guardamos un snapshot en el server (debounced 2s) para que el cron pueda
   * mandar un recovery email si el cliente no termina. Solo dispara cuando
   * el email cambia, no en cada keystroke. */
  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
    if (!items.length) return undefined;
    if (!import.meta.env.VITE_API_URL) return undefined;
    const t = setTimeout(() => {
      api.post('/cart/save', {
        email,
        name: form.name.trim(),
        userId: user?.id || user?._id || null,
        items: items.map((i) => ({
          productId: i.productId || i._id || (typeof i.id === 'string' && i.id.includes('::') ? i.id.split('::')[0] : i.id),
          slug:  i.slug,
          name:  i.name,
          brand: i.brand || '',
          price: i.price,
          qty:   i.qty,
          image: i.images?.[0] || i.img || '',
          selectedVariants: i.selectedVariants || undefined,
        })),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [form.email, form.name, items, user]);
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});

  const [couponCode,    setCouponCode]    = useState('');
  const [coupon,        setCoupon]        = useState(() =>
    cartCouponCode
      ? { code: cartCouponCode, discount: cartCouponDiscount, description: cartCouponDesc, type: cartCouponType, freeShipping: cartCouponType === 'shipping' }
      : null
  );
  const [couponError,   setCouponError]   = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting,    setSubmitting]    = useState(false);

  /* Metodo de pago — WhatsApp (legacy) o SINPE Movil (cliente paga primero
   * y sube comprobante). El comprobante se sube a Cloudinary antes de
   * crear la orden; guardamos solo url + publicId. */
  const [paymentMethod, setPaymentMethod]   = useState('whatsapp');
  const [proof,         setProof]           = useState(null);   /* { url, publicId, previewUrl } */
  const [proofUploading,setProofUploading]  = useState(false);
  const [proofError,    setProofError]      = useState('');

  const shippingCost = coupon?.freeShipping ? 0 : SHIPPING[shipping].price;
  const discount     = coupon ? Math.min(coupon.discount || 0, total) : 0;
  const grandTotal   = Math.max(0, total - discount) + shippingCost;

  /* ── Validation helpers ── */
  const validateField = useCallback((k, v) => {
    if (k === 'address') return validators.address(v, shipping);
    return validators[k]?.(v) ?? '';
  }, [shipping]);

  const handleChange = (k) => (e) => {
    let v = e.target.value;
    if (k === 'phone') v = formatPhone(v);
    if (k === 'name')  v = v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s''-]/g, ''); // block numbers/symbols live
    setForm((f) => ({ ...f, [k]: v }));
    if (touched[k]) setErrors((err) => ({ ...err, [k]: validateField(k, v) }));
  };

  const handleBlur = (k) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((err) => ({ ...err, [k]: validateField(k, form[k]) }));
  };

  const validateAll = () => {
    const fields = ['name', 'phone', 'email', 'address', 'notes'];
    const newErr = {};
    fields.forEach((k) => { newErr[k] = validateField(k, form[k]); });
    setErrors(newErr);
    setTouched({ name:true, phone:true, email:true, address:true, notes:true });
    return Object.values(newErr).every((e) => !e);
  };

  const handleAddressPick = ({ address, lat, lng }) => {
    setForm((f) => ({ ...f, address, lat, lng }));
    setTouched((t) => ({ ...t, address: true }));
    setErrors((e) => ({ ...e, address: '' }));
  };

  /* ── Coupon ── */
  const applyCoupon = async (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (!USE_API) { setCouponError('Cupones requieren backend activo.'); return; }
    setCouponLoading(true); setCouponError('');
    try {
      const { data } = await api.post('/coupons/validate', { code, subtotal: total, shippingCost: SHIPPING[shipping].price });
      setCoupon(data); setCouponCode('');
    } catch (err) {
      setCouponError(err.response?.data?.error || 'No se pudo aplicar el cupón'); setCoupon(null);
    } finally { setCouponLoading(false); }
  };

  const removeCoupon = () => { setCoupon(null); setCouponError(''); clearCartCoupon(); };

  /* Upload comprobante SINPE — antes de enviar la orden. Devuelve url+publicId
   * que el submit incluye en el payload. Validacion + Cloudinary del lado del
   * server (5MB max, magic bytes verificados). */
  const handleProofUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProofError('La imagen no debe pesar mas de 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setProofError('Solo se aceptan imagenes (JPG, PNG, WEBP)');
      return;
    }
    setProofError('');
    setProofUploading(true);
    try {
      const fd = new FormData();
      fd.append('proof', file);
      const { data } = await api.post('/orders/payment-proof', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProof({
        url: data.url,
        publicId: data.publicId,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (err) {
      setProofError(err?.response?.data?.error || 'No se pudo subir el comprobante');
    } finally {
      setProofUploading(false);
    }
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (submitting) return;
    if (paymentMethod === 'sinpe' && !proof) {
      setProofError('Subí el comprobante del SINPE antes de finalizar');
      document.querySelector('[data-proof-section]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    trackBeginCheckout(items, grandTotal);

    const customerData = {
      ...form,
      shippingMethod: SHIPPING[shipping].label,
      shippingCost,
      coupon: coupon ? { code: coupon.code, discount, freeShipping: coupon.freeShipping } : null,
    };

    let orderNumber = null;
    if (USE_API) {
      setSubmitting(true);
      try {
        const { data } = await api.post('/orders', {
          customer: {
            name:     form.name.trim(),
            phone:    form.phone.replace(/\D/g, ''),
            email:    form.email.trim() || '',
            province: isPickup(shipping) ? 'Puntarenas' : form.province,
            address:  isPickup(shipping) ? 'Retiro en local — El Roble, Puntarenas' : form.address,
            notes:    form.notes.trim() || '',
            lat: form.lat || null, lng: form.lng || null,
          },
          items: items.map((i) => ({
            // productId = id REAL del producto. `i.id` ahora incluye el sufijo
            // de variante (Tono=Rosado), asi que ya no sirve como productId
            // para el backend. Usar i.productId si esta (cartStore lo guarda
            // a partir de v2); fallback a otros campos para items legacy.
            productId: i.productId || i._id || (typeof i.id === 'string' && i.id.includes('::') ? i.id.split('::')[0] : i.id),
            name: i.name,
            brand: i.brand || '',
            price: i.price,
            qty: i.qty,
            // El cart guarda items con `images` (array) cuando vienen de la
            // API; el legacy `img` solo existe en data hardcoded. Cubrimos
            // ambos para que la orden quede con la imagen real.
            image: i.images?.[0] || i.img || '',
            // Variantes elegidas (Tono, Color, etc.) — el backend las guarda
            // en orderItem.selectedVariants y se renderizan en admin/email.
            selectedVariants: i.selectedVariants || undefined,
          })),
          subtotal: total, shippingCost, shippingMethod: shipping,
          coupon: coupon ? { code: coupon.code, discount, freeShipping: coupon.freeShipping } : null,
          paymentMethod,
          paymentProofUrl: proof?.url || '',
          paymentProofPublicId: proof?.publicId || '',
        });
        orderNumber = data.orderNumber;
        trackPurchase(data.orderNumber, items, grandTotal);
      } catch (err) {
        console.error('Error al crear pedido:', err?.response?.data || err?.message);
      } finally { setSubmitting(false); }
    }

    /* Si el cliente eligio SINPE, no abrimos WhatsApp — el pago ya quedo
     * registrado con su comprobante. Solo abrimos WA en el flow legacy. */
    if (paymentMethod === 'whatsapp') {
      const url = buildWhatsAppMessage(items, customerData, orderNumber);
      window.open(url, '_blank', 'noopener');
    }
    clearCart();
    navigate('/confirmacion', { state: { orderNumber, paymentMethod } });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 pt-24">
        <p className="text-ink-400 text-lg">Tu carrito está vacío.</p>
        <Link to="/" className="text-rose-500 font-semibold hover:underline">Ver productos</Link>
      </div>
    );
  }

  return (
    <main className="pt-20 pb-24 bg-cream-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="py-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-rose-500 transition-colors mb-5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver a la tienda
          </Link>
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-900 leading-tight">Completar pedido</h1>
              <p className="text-ink-400 text-sm mt-1">Te confirmamos por WhatsApp en minutos</p>
            </div>
            {/* Progress pills */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold">
              {['Datos','Envío','Pago'].map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`px-3 py-1 rounded-full ${i === 0 ? 'bg-rose-500 text-white' : 'bg-white text-ink-400 border border-cream-200'}`}>
                    {i + 1}. {s}
                  </span>
                  {i < 2 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-300"><polyline points="9 18 15 12 9 6"/></svg>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="grid lg:grid-cols-[1fr_360px] gap-6">

          {/* ── Left — form sections ── */}
          <div className="space-y-5">

            {/* Contact */}
            <Section step="1/3" Icon={SectionUserIcon} title="Datos de contacto" sub="Información para coordinar tu pedido">
              <div className="grid sm:grid-cols-2 gap-4">

                <Field label="Nombre completo" required error={errors.name} touched={touched.name} icon={<UserIcon />}>
                  <input
                    value={form.name}
                    onChange={handleChange('name')}
                    onBlur={handleBlur('name')}
                    placeholder="María García"
                    maxLength={60}
                    className={inputCls(touched.name, errors.name)}
                    data-error={touched.name && errors.name ? true : undefined}
                  />
                </Field>

                <Field label="Teléfono / WhatsApp" required error={errors.phone} touched={touched.phone} icon={<PhoneIcon />}
                  hint="8 dígitos CR">
                  <input
                    value={form.phone}
                    onChange={handleChange('phone')}
                    onBlur={handleBlur('phone')}
                    placeholder="8804-5100"
                    inputMode="numeric"
                    maxLength={9}
                    className={inputCls(touched.phone, errors.phone)}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Correo electrónico (recomendado)" error={errors.email} touched={touched.email} icon={<MailIcon />}
                    hint="💌 Te avisamos por mail cuando confirmemos, preparemos y enviemos tu pedido">
                    <input
                      type="email"
                      value={form.email}
                      onChange={handleChange('email')}
                      onBlur={handleBlur('email')}
                      placeholder="tucorreo@gmail.com"
                      maxLength={100}
                      className={inputCls(touched.email, errors.email)}
                    />
                  </Field>
                </div>

                {!isPickup(shipping) && (<>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-ink-600 uppercase tracking-wide mb-1.5">
                      Provincia <span className="text-rose-400">*</span>
                    </label>
                    <select required value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                      className={`${inputDef} pl-4`}>
                      {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label="Dirección exacta" required error={errors.address} touched={touched.address}>
                      <MapAddressPicker
                        required
                        value={form.address}
                        onChange={(v) => {
                          setForm((f) => ({ ...f, address: v, lat: null, lng: null }));
                          if (touched.address) setErrors((e) => ({ ...e, address: validators.address(v, shipping) }));
                        }}
                        onPick={handleAddressPick}
                        onFocus={() => {}}
                        onBlur={() => {
                          setTouched((t) => ({ ...t, address: true }));
                          setErrors((e) => ({ ...e, address: validators.address(form.address, shipping) }));
                        }}
                        placeholder="Ciudad, barrio, señas exactas"
                        className={inputCls(touched.address, errors.address)}
                      />
                    </Field>
                  </div>
                </>)}

                {isPickup(shipping) && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-ink-600 uppercase tracking-wide mb-2">Ubicación del local</label>
                    <div className="rounded-xl overflow-hidden border border-cream-200">
                      {MAPS_KEY
                        ? <iframe title="JD Virtual Store" width="100%" height="220" style={{ border:0, display:'block' }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=place_id:${PLACE_ID}&maptype=roadmap&zoom=17`} />
                        : <div className="h-32 bg-cream-100 flex items-center justify-center text-ink-400 text-sm">Mapa no disponible</div>
                      }
                      <div className="bg-cream-50 px-4 py-3 flex items-start gap-2.5">
                        <span className="text-rose-500 mt-0.5 flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-ink-900">JD Virtual Store · El Roble, Puntarenas</p>
                          <p className="text-xs text-ink-400 mt-0.5">Te confirmamos el punto exacto por WhatsApp</p>
                          <a href={`https://www.google.com/maps/search/?api=1&query=place_id:${PLACE_ID}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-rose-500 font-semibold hover:underline mt-1 inline-block">
                            Abrir en Google Maps →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <Field label="Notas adicionales" error={errors.notes} touched={touched.notes} icon={<NoteIcon />}
                    hint={`${form.notes.length}/300`}>
                    <textarea
                      value={form.notes}
                      onChange={handleChange('notes')}
                      onBlur={handleBlur('notes')}
                      rows={2}
                      maxLength={300}
                      placeholder="Color, variante, instrucciones especiales..."
                      className={`${inputCls(touched.notes, errors.notes)} resize-none`}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Shipping */}
            <Section step="2/3" Icon={SectionTruckIcon} title="Método de envío" sub="Elegí cómo recibir tu pedido">
              <div className="space-y-2.5">
                {Object.entries(SHIPPING).map(([key, val]) => (
                  <label key={key}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                      shipping === key
                        ? 'border-rose-400 bg-rose-50/60 shadow-sm'
                        : 'border-cream-200 hover:border-rose-200 bg-white'
                    }`}>
                    <input type="radio" name="shipping" value={key} checked={shipping === key} onChange={() => setShipping(key)} className="accent-rose-500 flex-shrink-0" />
                    <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${shipping === key ? 'bg-rose-100 text-rose-500' : 'bg-cream-100 text-ink-500'} transition-colors`}>
                      <val.Icon />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-900">{val.label}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{val.sub}</p>
                    </div>
                    <span className="font-bold text-ink-900 flex-shrink-0 text-sm">
                      {coupon?.freeShipping && key !== 'retiro'
                        ? <><span className="text-ink-300 line-through mr-1 font-normal text-xs">{formatCRC(val.price)}</span><span className="text-green-600">Gratis</span></>
                        : val.price === 0 ? <span className="text-green-600">Gratis</span> : formatCRC(val.price)}
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            {/* Payment */}
            <Section step="3/3" Icon={SectionPayIcon} title="Método de pago" sub="Elegí cómo querés pagar tu pedido">
              <PaymentSection
                paymentMethod={paymentMethod}
                onChange={setPaymentMethod}
                grandTotal={grandTotal}
                proof={proof}
                proofUploading={proofUploading}
                proofError={proofError}
                onProofUpload={handleProofUpload}
                onProofClear={() => { setProof(null); setProofError(''); }}
              />
            </Section>

          </div>

          {/* ── Right — sticky summary ── */}
          <div>
            <div className="bg-white rounded-2xl shadow-card border border-cream-100 sticky top-24">

              {/* Items */}
              <div className="p-5 border-b border-cream-100">
                <h2 className="font-display text-base font-bold text-ink-900 mb-4">Resumen del pedido</h2>
                <div className="space-y-3">
                  {items.map((i) => {
                    const itemImg = i.images?.[0] || i.img || '';
                    return (
                    <div key={i.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-cream-100 flex-shrink-0 border border-cream-100">
                        {itemImg
                          ? <img src={optimizedImage(itemImg, 96)} alt={i.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          : <div className="w-full h-full bg-cream-200" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink-900 truncate">{i.name}</p>
                        {i.selectedVariants && Object.keys(i.selectedVariants).length > 0 && (
                          <p className="text-[10px] text-rose-600 font-semibold truncate">
                            {Object.entries(i.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </p>
                        )}
                        <p className="text-[11px] text-ink-400">× {i.qty}</p>
                      </div>
                      <p className="text-sm font-bold text-ink-900 flex-shrink-0">{formatCRC(i.price * i.qty)}</p>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Coupon */}
              <div className="px-5 py-4 border-b border-cream-100">
                <AnimatePresence mode="wait">
                  {coupon ? (
                    <motion.div key="applied" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-xl px-3.5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                          <span className="font-mono font-bold text-sm text-green-800">{coupon.code}</span>
                        </div>
                        {coupon.description && <p className="text-[10px] text-green-700 mt-0.5 truncate">{coupon.description}</p>}
                      </div>
                      <button type="button" onClick={removeCoupon} className="text-green-400 hover:text-red-500 transition-colors flex-shrink-0 p-0.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="flex gap-2">
                        <input
                          type="text" value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && applyCoupon(e)}
                          placeholder="Código de cupón"
                          maxLength={20}
                          className="flex-1 border border-cream-200 rounded-xl px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all font-mono uppercase tracking-wider"
                        />
                        <button type="button" onClick={applyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-ink-900 text-white hover:bg-rose-500 transition-colors disabled:opacity-40 whitespace-nowrap">
                          {couponLoading ? '...' : 'Aplicar'}
                        </button>
                      </div>
                      {couponError && <p className="text-[11px] text-red-500 mt-1.5">{couponError}</p>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Totals */}
              <div className="px-5 py-4 space-y-2 text-sm">
                <div className="flex justify-between text-ink-500"><span>Subtotal</span><span>{formatCRC(total)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Descuento ({coupon.code})</span>
                    <span>−{formatCRC(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-ink-500">
                  <span>Envío</span>
                  <span>
                    {coupon?.freeShipping && SHIPPING[shipping].price > 0
                      ? <><span className="line-through text-ink-300 mr-1">{formatCRC(SHIPPING[shipping].price)}</span><span className="text-green-600">Gratis</span></>
                      : shippingCost === 0 ? <span className="text-green-600">Gratis</span> : formatCRC(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-ink-900 text-base pt-2 border-t border-cream-100">
                  <span>Total</span>
                  <span>{formatCRC(grandTotal)}</span>
                </div>
              </div>

              {/* Submit */}
              <div className="px-5 pb-5">
                <motion.button type="submit"
                  disabled={submitting}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1fbc59] disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors text-base shadow-lg">
                  {submitting ? (
                    <><svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Registrando...</>
                  ) : (
                    <><WaIcon /> Enviar pedido por WhatsApp</>
                  )}
                </motion.button>
                <p className="text-center text-[11px] text-ink-400 mt-2.5 leading-relaxed">
                  {paymentMethod === 'sinpe'
                    ? 'Tu comprobante queda adjunto. Verificamos el pago y te confirmamos por WhatsApp.'
                    : 'Se abrirá WhatsApp con tu pedido listo para enviar'}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

/* ── PaymentSection ──
 * Selector de metodo (WhatsApp / SINPE Movil). Si SINPE: muestra panel con
 * numero+nombre+monto, QR con los datos de pago para escanear desde la app
 * del banco, y campo para subir comprobante (validado backend-side).
 * Lift state: paymentMethod, proof, proofUploading, proofError vienen del
 * Checkout — esta seccion es solo presentacion + dispatch de upload. */
function PaymentSection({
  paymentMethod, onChange,
  grandTotal,
  proof, proofUploading, proofError,
  onProofUpload, onProofClear,
}) {
  const qrRef = useRef(null);
  const fileRef = useRef(null);

  /* Pintar el QR solo cuando esta seleccionado SINPE — no hace falta cargar
   * la lib qrcode (~50KB) si el cliente eligio WhatsApp. Import dinamico. */
  useEffect(() => {
    if (paymentMethod !== 'sinpe' || !qrRef.current) return;
    let cancelled = false;
    /* Contenido del QR: instrucciones legibles para que el cliente las copie
     * si su app no soporta deep links de SINPE (la mayoria de los bancos no
     * tiene URI scheme estandar). El QR sirve sobre todo como visual + para
     * escanear desde la PC y leer en el celu. */
    const payload = [
      'SINPE Movil — JD Virtual',
      `Tel: ${SINPE_NUMBER}`,
      `Nombre: ${SINPE_NAME}`,
      `Monto: ${formatCRC(grandTotal)}`,
    ].join('\n');
    import('qrcode').then((QR) => {
      if (cancelled || !qrRef.current) return;
      QR.toCanvas(qrRef.current, payload, { width: 180, margin: 1, color: { dark: '#1a1414', light: '#ffffff' } });
    });
    return () => { cancelled = true; };
  }, [paymentMethod, grandTotal]);

  const copyToClipboard = (text) => {
    try { navigator.clipboard?.writeText(text); } catch {}
  };

  return (
    <div className="space-y-2.5">
      {/* Selector de metodo */}
      <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
        paymentMethod === 'whatsapp'
          ? 'border-rose-400 bg-rose-50/60 shadow-sm'
          : 'border-cream-200 hover:border-rose-200 bg-white'
      }`}>
        <input type="radio" name="payment" value="whatsapp"
          checked={paymentMethod === 'whatsapp'} onChange={() => onChange('whatsapp')}
          className="accent-rose-500 flex-shrink-0" />
        <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === 'whatsapp' ? 'bg-rose-100 text-rose-500' : 'bg-cream-100 text-ink-500'} transition-colors`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.16c-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52s-.67-1.61-.92-2.21c-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37s-1.04 1.02-1.04 2.48 1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35"/></svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900">WhatsApp · Coordinamos pago</p>
          <p className="text-xs text-ink-400 mt-0.5">Te escribimos para confirmar y pasarte el SINPE</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Clásico</span>
      </label>

      <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
        paymentMethod === 'sinpe'
          ? 'border-rose-400 bg-rose-50/60 shadow-sm'
          : 'border-cream-200 hover:border-rose-200 bg-white'
      }`}>
        <input type="radio" name="payment" value="sinpe"
          checked={paymentMethod === 'sinpe'} onChange={() => onChange('sinpe')}
          className="accent-rose-500 flex-shrink-0" />
        <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === 'sinpe' ? 'bg-rose-100 text-rose-500' : 'bg-cream-100 text-ink-500'} transition-colors`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900">SINPE Móvil · Pagás ahora</p>
          <p className="text-xs text-ink-400 mt-0.5">Adjuntás el comprobante y dejamos todo listo</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Rápido</span>
      </label>

      {/* Panel SINPE */}
      <AnimatePresence>
        {paymentMethod === 'sinpe' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            data-proof-section
            className="overflow-hidden">
            <div className="mt-2 rounded-2xl border-2 border-rose-100 bg-gradient-to-br from-rose-50/60 to-white p-4 sm:p-5 space-y-4">
              <div className="grid sm:grid-cols-[180px_1fr] gap-4 items-start">
                {/* QR */}
                <div className="flex flex-col items-center bg-white border border-cream-200 rounded-xl p-3">
                  <canvas ref={qrRef} className="rounded" />
                  <p className="text-[10px] text-ink-400 mt-2 font-semibold uppercase tracking-widest">Datos del pago</p>
                </div>

                {/* Detalles + copy */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 bg-white border border-cream-200 rounded-xl px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Teléfono SINPE</p>
                      <p className="text-base font-mono font-bold text-ink-900">{SINPE_NUMBER}</p>
                    </div>
                    <button type="button" onClick={() => copyToClipboard(SINPE_NUMBER.replace(/\D/g, ''))}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0">
                      Copiar
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white border border-cream-200 rounded-xl px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">Nombre del titular</p>
                      <p className="text-sm font-semibold text-ink-900 truncate">{SINPE_NAME}</p>
                    </div>
                    <button type="button" onClick={() => copyToClipboard(SINPE_NAME)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0">
                      Copiar
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-rose-500 text-white rounded-xl px-3.5 py-2.5 shadow-sm">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-85">Monto a transferir</p>
                      <p className="text-lg font-bold leading-tight">{formatCRC(grandTotal)}</p>
                    </div>
                    <button type="button" onClick={() => copyToClipboard(String(grandTotal))}
                      className="text-xs font-bold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0">
                      Copiar
                    </button>
                  </div>
                </div>
              </div>

              {/* Instrucciones */}
              <ol className="text-[12px] text-ink-700 space-y-1.5 pl-5 list-decimal marker:text-rose-400 marker:font-bold">
                <li>Abrí la app de tu banco y entrá a <strong>SINPE Móvil</strong>.</li>
                <li>Transferí <strong>{formatCRC(grandTotal)}</strong> al <strong>{SINPE_NUMBER}</strong> ({SINPE_NAME}).</li>
                <li>Tomá un <strong>screenshot del comprobante</strong> y subilo acá abajo.</li>
              </ol>

              {/* Upload */}
              <div className="bg-white border-2 border-dashed border-cream-200 rounded-xl p-4">
                {proof ? (
                  <div className="flex items-center gap-3">
                    <img src={proof.previewUrl || proof.url} alt="Comprobante"
                      className="w-16 h-16 rounded-lg object-cover border border-cream-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Comprobante listo
                      </p>
                      <p className="text-[11px] text-ink-400 mt-0.5">Cambiar si te equivocaste</p>
                    </div>
                    <button type="button" onClick={onProofClear}
                      className="text-xs font-semibold text-ink-500 hover:text-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <input ref={fileRef} type="file" accept="image/*" hidden
                      onChange={(e) => onProofUpload(e.target.files?.[0])} />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      disabled={proofUploading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-rose-500 disabled:opacity-60 text-white text-sm font-bold transition-colors">
                      {proofUploading ? (
                        <>
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          Subiendo…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          Subir comprobante
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-ink-400 mt-2">JPG, PNG o WEBP · máx 5MB</p>
                  </div>
                )}
                {proofError && (
                  <p className="text-[11px] text-red-600 mt-2 text-center font-medium">{proofError}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
