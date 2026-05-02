import { useState, useEffect, useCallback } from 'react';
import { formatCRC } from '../../lib/currency';
import api, { assetUrl } from '../../lib/api';
import useToastStore from '../../store/toastStore';
import QRCode from 'qrcode';

const USE_API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  pendiente:  { label: 'Pendiente',  dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200'  },
  confirmado: { label: 'Confirmado', dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 border-blue-200'        },
  preparando: { label: 'Preparando', dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-200'  },
  enviado:    { label: 'Enviado',    dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200'  },
  entregado:  { label: 'Entregado',  dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700 border-green-200'     },
  cancelado:  { label: 'Cancelado',  dot: 'bg-red-400',    badge: 'bg-red-50 text-red-600 border-red-200'           },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, dot: 'bg-ink-400', badge: 'bg-ink-100 text-ink-600 border-ink-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <select value={value} onChange={onChange}
      className="border border-cream-200 rounded-xl px-2.5 py-1.5 text-xs text-ink-700 focus:outline-none focus:border-rose-400 cursor-pointer bg-white transition-colors">
      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}

/* ── Print order (package sheet) ── */
async function printOrder(order) {
  const fmt = (n) => `₡${Number(n || 0).toLocaleString('es-CR')}`;
  const date = new Date(order.createdAt).toLocaleString('es-CR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const rows = (order.items || []).map((i) =>
    `<tr>
      <td style="padding:8px 4px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #eee;text-align:right">${fmt(i.price)}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmt(i.price * i.qty)}</td>
    </tr>`
  ).join('');

  /* QR — uses lat/lng when available, otherwise address text */
  let qrHtml = '';
  const hasCoords = order.customer?.lat && order.customer?.lng;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${order.customer.lat},${order.customer.lng}`
    : order.customer?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.customer.address}, ${order.customer.province}, Costa Rica`)}`
      : null;

  if (mapsUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(mapsUrl, {
        width: 180,
        margin: 2,
        color: { dark: '#111111', light: '#ffffff' },
      });
      qrHtml = `
        <div class="section-title">Ubicación del cliente</div>
        <div class="qr-box">
          <img src="${qrDataUrl}" alt="QR ubicación" width="140" height="140" style="display:block;border-radius:8px" />
          <div class="qr-info">
            <div style="font-weight:bold;font-size:13px;color:#111;margin-bottom:6px">📲 Ubicación exacta</div>
            <div style="font-size:12px;color:#444;margin-bottom:8px;line-height:1.5">
              ${order.customer?.address || ''}<br>
              <span style="color:#888">${order.customer?.province || ''}</span>
            </div>
            <div style="font-size:11px;color:#B85F72;font-weight:600;border:1px solid #B85F72;border-radius:6px;padding:5px 8px;display:inline-block">
              📍 Escaneá el QR para ver la ubicación exacta en Google Maps
            </div>
          </div>
        </div>
      `;
    } catch {
      /* QR generation failed silently — show address only */
      qrHtml = `
        <div class="section-title">Dirección de entrega</div>
        <div class="info-box">
          ${order.customer?.address}, ${order.customer?.province}
        </div>
      `;
    }
  }

  const w = window.open('', '_blank', 'width=780,height=820');
  w.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="utf-8">
    <title>Hoja del paquete — Orden ${order.orderNumber}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;color:#111;padding:28px;font-size:14px}
      .header{text-align:center;margin-bottom:24px;padding-bottom:18px;border-bottom:3px solid #B85F72}
      .store-name{font-size:13px;font-weight:bold;color:#B85F72;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
      .order-num{font-size:28px;font-weight:bold;color:#111;letter-spacing:1px}
      .date{color:#666;font-size:12px;margin-top:4px}
      .status-badge{display:inline-block;margin-top:8px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:bold}
      .section-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:8px;margin-top:20px}
      .info-box{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:14px;line-height:1.7}
      .qr-box{background:#fafafa;border:2px dashed #B85F72;border-radius:10px;padding:16px;display:flex;align-items:center;gap:20px}
      .qr-info{flex:1}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f5f0f0;padding:8px 4px;text-align:left;font-size:11px;text-transform:uppercase;color:#888}
      th:last-child,th:nth-child(3),th:nth-child(2){text-align:right}
      th:nth-child(2){text-align:center}
      .totals{margin-top:16px;border-top:2px solid #eee;padding-top:12px}
      .total-row{display:flex;justify-content:space-between;padding:4px 0;color:#666}
      .grand-total{font-size:18px;font-weight:bold;color:#111;border-top:1px solid #eee;margin-top:8px;padding-top:8px}
      .footer{text-align:center;color:#aaa;font-size:11px;margin-top:28px;padding-top:14px;border-top:1px solid #eee}
      .print-btn{display:block;margin:20px auto 0;padding:10px 28px;background:#B85F72;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer}
      @media print{.print-btn{display:none!important}body{padding:16px}}
    </style>
  </head><body>
    <div class="header">
      <div class="store-name">JD Virtual Store</div>
      <div class="order-num">${order.orderNumber}</div>
      <div class="date">${date}</div>
      <div class="status-badge">Estado: ${STATUS_CONFIG[order.status]?.label || order.status}</div>
    </div>

    <div class="section-title">Cliente</div>
    <div class="info-box">
      <strong>${order.customer?.name}</strong><br>
      Tel: ${order.customer?.phone}<br>
      Envío: ${order.shippingMethod || 'correos'}
      ${order.customer?.notes ? `<br><em>Nota: ${order.customer.notes}</em>` : ''}
    </div>

    ${qrHtml}

    <div class="section-title">Productos</div>
    <table>
      <thead><tr>
        <th>Producto</th>
        <th style="text-align:center">Cant.</th>
        <th style="text-align:right">Precio</th>
        <th style="text-align:right">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>
      <div class="total-row"><span>Envío</span><span>${order.shippingCost ? fmt(order.shippingCost) : 'Gratis'}</span></div>
      ${order.discount ? `<div class="total-row"><span>Descuento ${order.coupon?.code ? '(' + order.coupon.code + ')' : ''}</span><span>-${fmt(order.discount)}</span></div>` : ''}
      <div class="total-row grand-total"><span>TOTAL</span><span>${fmt(order.total)}</span></div>
    </div>

    <div class="footer">JD Virtual Store &nbsp;·&nbsp; Hoja del paquete &nbsp;·&nbsp; Impreso el ${new Date().toLocaleDateString('es-CR')}</div>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir hoja del paquete</button>
  </body></html>`);
  w.document.close();
}

/* ── Confirm print popup (shown when order is confirmed) ── */
function ConfirmPrintModal({ order, onPrint, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#dbeafe,#eff6ff)', border: '1px solid #bfdbfe' }}>
            ✅
          </div>
          <h3 className="font-display text-lg font-bold text-ink-900 mb-1">¡Orden confirmada!</h3>
          <p className="text-sm text-ink-500 leading-relaxed">
            La orden <span className="font-mono font-bold text-rose-500">{order.orderNumber}</span> está confirmada.
            <br />¿Querés imprimir la hoja del paquete ahora?
          </p>
        </div>
        <div className="px-6 pb-5 space-y-2">
          <button
            onClick={onPrint}
            className="w-full flex items-center justify-center gap-2.5 bg-ink-900 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-colors text-sm shadow-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Sí, imprimir hoja del paquete
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-ink-500 hover:bg-cream-50 transition-colors">
            Después
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Order detail drawer ── */
function OrderDrawer({ order, onClose, onUpdateStatus, onUpdateNotes, onSearchPhone }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const [notes, setNotes] = useState(order.internalNotes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const hasCoords = order.customer?.lat && order.customer?.lng;
    const mapsUrl = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${order.customer.lat},${order.customer.lng}`
      : order.customer?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.customer.address}, ${order.customer.province}, Costa Rica`)}`
        : null;
    if (mapsUrl) {
      QRCode.toDataURL(mapsUrl, { width: 120, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [order.customer]);

  if (!order) return null;

  const itemsText = order.items
    .map((i) => `• ${i.name} x${i.qty} — ${formatCRC(i.price * i.qty)}`)
    .join('\n');

  const whatsappMessage = [
    `¡Hola ${order.customer?.name?.split(' ')[0] || ''}! 👋`,
    `Te escribo de JD por tu pedido *${order.orderNumber}*:`,
    '',
    itemsText,
    '',
    `Subtotal: ${formatCRC(order.subtotal)}`,
    order.shippingCost ? `Envío: ${formatCRC(order.shippingCost)}` : null,
    `*Total: ${formatCRC(order.total)}*`,
    '',
    `Dirección de envío:`,
    `${order.customer?.address}, ${order.customer?.province}`,
    '',
    '¿Podemos coordinar el pago y envío? 🙏',
  ].filter(Boolean).join('\n');

  const phone = (order.customer?.phone || '').replace(/\D/g, '');
  const waHref = `https://wa.me/${phone.length === 8 ? '506' + phone : phone}?text=${encodeURIComponent(whatsappMessage)}`;
  const createdAt = new Date(order.createdAt).toLocaleString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const copyAddress = () => {
    navigator.clipboard?.writeText(`${order.customer?.name}\n${order.customer?.phone}\n${order.customer?.address}, ${order.customer?.province}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative ml-auto w-full max-w-xl h-full bg-[#F4F0EF] shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="bg-white border-b border-cream-200 px-5 py-4 flex items-center gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-900 transition-colors" title="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-mono font-bold text-rose-500 text-sm tracking-wide">{order.orderNumber}</p>
            <p className="text-xs text-ink-400">{createdAt}</p>
          </div>
          <button onClick={() => printOrder(order)} title="Imprimir orden"
            className="p-1.5 text-ink-400 hover:text-ink-900 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
          </button>
          <StatusBadge status={order.status} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Customer card */}
          <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-ink-400 uppercase tracking-widest">Cliente</p>
              <div className="flex items-center gap-3">
                <button onClick={copyAddress}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold">Copiar datos</button>
                <button onClick={() => { onClose(); onSearchPhone(order.customer?.phone); }}
                  className="text-xs text-blue-500 hover:text-blue-600 font-semibold">Ver historial</button>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-3">
                {order.userId?.picture ? (
                  <img src={order.userId.picture} alt={order.userId.name}
                    className="w-10 h-10 rounded-full object-cover border border-cream-200 flex-shrink-0" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-ink-900">{order.customer?.name}</p>
                    {order.userId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full"
                        title="Pedido con cuenta verificada">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Google
                      </span>
                    )}
                  </div>
                  {order.userId?.email && (
                    <a href={`mailto:${order.userId.email}`} className="text-[11px] text-blue-600 hover:underline block truncate">
                      ✉ {order.userId.email}
                    </a>
                  )}
                  {!order.userId && order.customer?.email && (
                    <a href={`mailto:${order.customer.email}`} className="text-[11px] text-ink-500 hover:underline block truncate">
                      ✉ {order.customer.email}
                    </a>
                  )}
                  <a href={`tel:${order.customer?.phone}`} className="text-sm text-ink-500 hover:text-rose-500 transition-colors block">
                    📞 {order.customer?.phone}
                  </a>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-cream-100">
              <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-1">Envío</p>
              <p className="text-sm text-ink-700">{order.customer?.address}</p>
              <p className="text-xs text-ink-500 mt-0.5">{order.customer?.province}</p>
              <p className="text-[11px] text-ink-400 mt-2 capitalize">Método: {order.shippingMethod}</p>
              {qrDataUrl && (
                <div className="mt-3 flex items-start gap-3 bg-cream-50 rounded-xl p-3 border border-cream-200">
                  <img src={qrDataUrl} alt="QR ubicación" className="w-16 h-16 rounded-lg flex-shrink-0 border border-cream-200" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-ink-600 mb-0.5">📲 Ubicación en mapa</p>
                    <p className="text-[10px] text-ink-400 leading-relaxed">
                      Escaneá el QR para ver la dirección exacta del cliente en Google Maps.
                      {order.customer?.lat && order.customer?.lng && (
                        <span className="block mt-1 text-green-600 font-semibold">✓ Coordenadas GPS registradas</span>
                      )}
                    </p>
                    <a
                      href={order.customer?.lat && order.customer?.lng
                        ? `https://www.google.com/maps/search/?api=1&query=${order.customer.lat},${order.customer.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.customer?.address}, ${order.customer?.province}, Costa Rica`)}`
                      }
                      target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-rose-500 font-semibold hover:underline mt-1 inline-block">
                      Abrir en Maps →
                    </a>
                  </div>
                </div>
              )}
            </div>
            {order.customer?.notes && (
              <div className="pt-3 border-t border-cream-100">
                <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-1">Notas</p>
                <p className="text-sm text-ink-700 whitespace-pre-wrap">{order.customer.notes}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-5">
            <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">
              Productos ({order.items?.length})
            </p>
            <div className="divide-y divide-cream-100">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {item.image
                    ? <img src={assetUrl(item.image)} alt={item.name} className="w-12 h-12 object-cover rounded-xl border border-cream-200 flex-shrink-0" />
                    : <div className="w-12 h-12 rounded-xl bg-cream-100 flex-shrink-0 flex items-center justify-center text-ink-300 text-xs">📷</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-ink-400">{item.brand} · {formatCRC(item.price)} c/u</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-ink-900 text-sm whitespace-nowrap">{formatCRC(item.price * item.qty)}</p>
                    <p className="text-xs text-ink-400">× {item.qty}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-5 space-y-2 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>{formatCRC(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>Envío</span>
              <span>{order.shippingCost ? formatCRC(order.shippingCost) : 'Gratis'}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Descuento {order.coupon?.code ? `(${order.coupon.code})` : ''}</span>
                <span>-{formatCRC(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-cream-100 font-bold text-ink-900 text-base">
              <span>Total</span>
              <span>{formatCRC(order.total)}</span>
            </div>
          </div>

          {/* Internal notes */}
          <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-5">
            <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Notas internas</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Anotaciones solo visibles para vos (coordenadas, detalles del pago, etc.)"
              className="w-full border border-cream-200 rounded-xl px-3 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 transition-colors resize-none" />
            <button onClick={async () => { setSavingNotes(true); await onUpdateNotes(order._id, notes); setSavingNotes(false); }}
              disabled={savingNotes}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-ink-900 text-white hover:bg-rose-500 transition-colors disabled:opacity-50">
              {savingNotes ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>

          {/* Status changer */}
          <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-5">
            <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Cambiar estado</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => onUpdateStatus(order._id, k)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    order.status === k
                      ? 'bg-ink-900 text-white border-ink-900'
                      : 'bg-white text-ink-600 border-cream-200 hover:border-rose-300'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-white border-t border-cream-200 px-5 py-4 space-y-2 flex-shrink-0">
          <div className="flex gap-2">
            <a href={waHref} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-3 rounded-xl transition-colors text-sm shadow-btn flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A12 12 0 0 0 3.48 20.52L2 22l1.48-1.48a12 12 0 0 0 17.04-17.04zM12 21a9 9 0 0 1-4.6-1.27l-.33-.2-3.13.82.83-3.07-.21-.33A9 9 0 1 1 12 21z"/><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96s-.47-.15-.67.15-.77.96-.94 1.16-.35.22-.65.07a8 8 0 0 1-2.37-1.46 8.8 8.8 0 0 1-1.64-2.04c-.17-.3 0-.45.13-.6.14-.14.3-.35.45-.52s.2-.3.3-.5a.55.55 0 0 0 0-.52c-.08-.15-.68-1.62-.92-2.22s-.5-.5-.67-.5h-.57a1.1 1.1 0 0 0-.8.37 3.35 3.35 0 0 0-1.04 2.49 5.8 5.8 0 0 0 1.22 3.1 13.4 13.4 0 0 0 5.15 4.56c.72.31 1.28.5 1.72.63a4.16 4.16 0 0 0 1.9.12 3.1 3.1 0 0 0 2.03-1.43 2.53 2.53 0 0 0 .17-1.43c-.07-.12-.27-.2-.56-.35z"/></svg>
              WhatsApp al cliente
            </a>
            <button onClick={onClose}
              className="px-4 py-3 rounded-xl text-sm font-semibold border border-cream-200 text-ink-600 hover:bg-cream-50 transition-colors">
              Cerrar
            </button>
          </div>
          <button
            onClick={() => printOrder(order)}
            className="w-full flex items-center justify-center gap-2.5 bg-ink-900 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir hoja del paquete
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ── Pagination ── */
function Pagination({ page, pages, onChange }) {
  const btnCls = 'px-3 py-1.5 rounded-lg text-xs font-semibold border border-cream-200 text-ink-600 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className={btnCls}>← Anterior</button>
      <span className="px-2 text-xs text-ink-500">Página <strong className="text-ink-900">{page}</strong> / {pages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= pages} className={btnCls}>Siguiente →</button>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon, label, value, accent, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-4 sm:p-5 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: bg }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="font-display text-xl font-bold truncate" style={{ color: accent }}>{value}</p>
      </div>
    </div>
  );
}

/* ── Order card — mobile ── */
function OrderCard({ o, onOpen, onUpdateStatus, selected, onToggle }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-card p-4 space-y-3 transition-colors ${selected ? 'border-rose-300 bg-rose-50/30' : 'border-cream-100'}`}>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={selected} onChange={onToggle}
          className="w-4 h-4 accent-rose-500 cursor-pointer flex-shrink-0" onClick={(e) => e.stopPropagation()} />
        <button onClick={() => onOpen(o)} className="flex-1 flex items-center justify-between gap-2 text-left">
          <span className="font-mono font-bold text-rose-500 text-sm tracking-wide">{o.orderNumber}</span>
          <StatusBadge status={o.status} />
        </button>
      </div>
      <button onClick={() => onOpen(o)} className="w-full flex items-center justify-between gap-2 text-left">
        <div>
          <p className="font-semibold text-ink-900 text-sm">{o.customer?.name}</p>
          <p className="text-xs text-ink-400">{o.customer?.phone}</p>
        </div>
        <p className="font-bold text-ink-900 text-base">{formatCRC(o.total)}</p>
      </button>
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-cream-100">
        <p className="text-xs text-ink-400">
          {new Date(o.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <StatusSelect value={o.status} onChange={(e) => onUpdateStatus(o._id, e.target.value)} />
      </div>
    </div>
  );
}

/* ── No API state ── */
function NoApi() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 leading-none">Órdenes</h1>
        <p className="text-ink-400 text-sm mt-1">Gestión de pedidos</p>
      </div>
      <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cream-100 flex items-center justify-center text-3xl mx-auto mb-5">📦</div>
        <h2 className="font-display text-xl font-semibold text-ink-900 mb-2">Backend no conectado</h2>
        <p className="text-ink-400 text-sm max-w-sm mx-auto leading-relaxed">
          Configurá <code className="bg-cream-100 px-1.5 py-0.5 rounded text-rose-500 text-xs">VITE_API_URL</code> en el archivo{' '}
          <code className="bg-cream-100 px-1.5 py-0.5 rounded text-rose-500 text-xs">.env</code> para gestionar órdenes desde el servidor.
        </p>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

function exportCSV(orders) {
  const headers = ['Orden','Fecha','Cliente','Telefono','Provincia','Direccion','Items','Subtotal','Envio','Descuento','Total','Estado','Cupon'];
  const rows = orders.map((o) => [
    o.orderNumber,
    new Date(o.createdAt).toLocaleDateString('es-CR'),
    o.customer?.name || '',
    o.customer?.phone || '',
    o.customer?.province || '',
    (o.customer?.address || '').replace(/,/g, ';'),
    (o.items || []).map((i) => `${i.name} x${i.qty}`).join(' | '),
    o.subtotal || 0,
    o.shippingCost || 0,
    o.discount || 0,
    o.total || 0,
    o.status,
    o.coupon?.code || '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ordenes-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function AdminOrders() {
  const [orders, setOrders]             = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected]         = useState(null);
  const [search, setSearch]             = useState('');
  const [debouncedQ, setDebouncedQ]     = useState('');
  const [page, setPage]                 = useState(1);
  const [pages, setPages]               = useState(1);
  const [total, setTotal]               = useState(0);
  const [confirmPrint, setConfirmPrint] = useState(null);

  /* ── Bulk selection ── */
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus]   = useState('confirmado');
  const [bulking, setBulking]         = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, debouncedQ]);
  useEffect(() => { setSelectedIds(new Set()); }, [orders]);

  const load = useCallback(async () => {
    if (!USE_API) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (debouncedQ)   params.q      = debouncedQ;
      const [ordersRes, statsRes] = await Promise.all([
        api.get('/orders/admin/all', { params }),
        api.get('/orders/admin/stats'),
      ]);
      setOrders(ordersRes.data.orders || []);
      setPages(ordersRes.data.pages || 1);
      setTotal(ordersRes.data.total || 0);
      setStats(statsRes.data);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [statusFilter, debouncedQ, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('jd:new-order', handler);
    return () => window.removeEventListener('jd:new-order', handler);
  }, [load]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o._id)));
    }
  };

  const bulkUpdate = async () => {
    if (!selectedIds.size) return;
    setBulking(true);
    try {
      const { data } = await api.patch('/orders/admin/bulk-status', {
        ids: [...selectedIds],
        status: bulkStatus,
      });
      useToastStore.getState().success(`${data.updated} órdenes actualizadas a "${STATUS_CONFIG[bulkStatus]?.label}"`);
      setSelectedIds(new Set());
      load();
    } catch (err) {
      useToastStore.getState().error(err.response?.data?.error || 'Error al actualizar');
    } finally { setBulking(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/orders/admin/${id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status: data.status } : o)));
      setSelected((s) => (s && s._id === id ? { ...s, status: data.status } : s));
      useToastStore.getState().success(`Estado cambiado a "${STATUS_CONFIG[status]?.label || status}"`);

      if (status === 'confirmado') {
        const order = orders.find((o) => o._id === id) || selected;
        if (order) setConfirmPrint({ ...order, status: 'confirmado' });
      }
      api.get('/orders/admin/stats').then((r) => setStats(r.data)).catch(() => {});

      if (status === 'enviado') {
        const order = orders.find((o) => o._id === id) || selected;
        if (order) {
          const firstName = order.customer?.name?.split(' ')[0] || '';
          const trackUrl  = `${window.location.origin}/pedido/${order.orderNumber}`;
          const msg = [
            `Hola ${firstName}!`,
            `Tu pedido *#${order.orderNumber}* ya fue enviado y esta en camino.`,
            '',
            `Podes rastrear el estado aqui:`,
            trackUrl,
            '',
            'Gracias por tu compra! Cualquier consulta estamos para ayudarte.',
          ].join('\n');
          const phone = (order.customer?.phone || '').replace(/\D/g, '');
          const wa = `https://wa.me/${phone.length === 8 ? '506' + phone : phone}?text=${encodeURIComponent(msg)}`;
          window.open(wa, '_blank');
        }
      }
    } catch (err) {
      useToastStore.getState().error(err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const searchByPhone = (phone) => {
    if (phone) setSearch(phone);
  };

  if (!USE_API) return <NoApi />;

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink-900 leading-none">Órdenes</h1>
          <p className="text-ink-400 text-sm mt-1">{stats?.totalOrders ?? '—'} órdenes en total</p>
        </div>
        {orders.length > 0 && (
          <button onClick={() => exportCSV(orders)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-cream-200 text-ink-600 hover:bg-cream-50 transition-colors bg-white shadow-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar CSV
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon="📋" label="Total órdenes"   value={stats.totalOrders}              accent="#B85F72" bg="#FBF0F2" />
          <StatCard icon="🕐" label="Hoy"             value={stats.todayOrders}              accent="#3B82F6" bg="#EFF6FF" />
          <StatCard icon="💰" label="Ingresos semana" value={formatCRC(stats.weekRevenue)}   accent="#16A34A" bg="#F0FDF4" />
          <StatCard icon="⏳" label="Pendientes"      value={stats.statusCounts?.pendiente || 0} accent="#D97706" bg="#FFFBEB" />
        </div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="bg-ink-900 text-white rounded-2xl px-5 py-3.5 flex items-center gap-4 flex-wrap shadow-lg">
          <span className="text-sm font-semibold">
            {selectedIds.size} {selectedIds.size === 1 ? 'orden seleccionada' : 'órdenes seleccionadas'}
          </span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-white/60 text-xs">Cambiar a:</span>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
              className="bg-white/10 text-white border border-white/20 rounded-xl px-3 py-1.5 text-sm focus:outline-none cursor-pointer">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k} className="text-ink-900 bg-white">{v.label}</option>
              ))}
            </select>
            <button onClick={bulkUpdate} disabled={bulking}
              className="px-4 py-1.5 rounded-xl text-sm font-bold bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50">
              {bulking ? 'Actualizando...' : 'Aplicar'}
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-white/60 hover:text-white text-xs transition-colors">
            Cancelar
          </button>
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-4 space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número de orden, cliente o teléfono..."
            className="w-full pl-9 pr-9 border border-cream-200 rounded-xl py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600" title="Limpiar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-400 uppercase tracking-widest mr-1">Estado:</span>
          <button onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!statusFilter ? 'bg-ink-900 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200'}`}>
            Todos
          </button>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${statusFilter === k ? 'bg-ink-900 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
              {v.label}
              {stats?.statusCounts?.[k] ? <span className={`text-[10px] ${statusFilter === k ? 'text-white/70' : 'text-ink-400'}`}>{stats.statusCounts[k]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-8 text-center text-ink-400 text-sm">
          Cargando órdenes...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-100 shadow-card p-14 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-ink-400 font-medium">
            {debouncedQ
              ? `No hay resultados para "${debouncedQ}".`
              : `No hay órdenes${statusFilter ? ' con este estado' : ' todavía'}.`}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-cream-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-50 border-b border-cream-200">
                  <th className="pl-5 pr-3 py-3.5 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="w-4 h-4 accent-rose-500 cursor-pointer" />
                  </th>
                  {['Orden','Cliente','Total','Estado','Fecha','Cambiar estado'].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-[11px] font-bold text-ink-400 uppercase tracking-widest last:px-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}
                    className={`hover:bg-cream-50/60 transition-colors border-b border-cream-100 last:border-0 ${selectedIds.has(o._id) ? 'bg-rose-50/40' : ''}`}>
                    <td className="pl-5 pr-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(o._id)} onChange={() => toggleSelect(o._id)}
                        className="w-4 h-4 accent-rose-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-rose-500 text-sm tracking-wide cursor-pointer" onClick={() => setSelected(o)}>{o.orderNumber}</td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => setSelected(o)}>
                      <div className="flex items-center gap-2">
                        {o.userId?.picture && (
                          <img src={o.userId.picture} alt="" className="w-6 h-6 rounded-full object-cover border border-cream-200 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900 text-sm flex items-center gap-1.5">
                            <span className="truncate">{o.customer?.name}</span>
                            {o.userId && (
                              <span title="Cuenta de Google verificada" className="flex-shrink-0">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-ink-400">{o.customer?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-ink-900 whitespace-nowrap cursor-pointer" onClick={() => setSelected(o)}>{formatCRC(o.total)}</td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => setSelected(o)}><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3.5 text-ink-400 text-xs whitespace-nowrap cursor-pointer" onClick={() => setSelected(o)}>
                      {new Date(o.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <StatusSelect value={o.status} onChange={(e) => updateStatus(o._id, e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-cream-100 text-xs text-ink-400 flex items-center justify-between">
              <span>Mostrando <strong className="text-ink-700">{orders.length}</strong> de <strong className="text-ink-700">{total}</strong></span>
              {pages > 1 && (
                <Pagination page={page} pages={pages} onChange={setPage} />
              )}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((o) => (
              <OrderCard key={o._id} o={o} onOpen={setSelected} onUpdateStatus={updateStatus}
                selected={selectedIds.has(o._id)} onToggle={() => toggleSelect(o._id)} />
            ))}
            {pages > 1 && (
              <div className="pt-2">
                <Pagination page={page} pages={pages} onChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
          onSearchPhone={searchByPhone}
          onUpdateNotes={async (id, notes) => {
            try {
              await api.patch(`/orders/admin/${id}/notes`, { notes });
              setOrders((prev) => prev.map((o) => o._id === id ? { ...o, internalNotes: notes } : o));
              useToastStore.getState().success('Nota guardada');
            } catch { useToastStore.getState().error('No se pudo guardar la nota'); }
          }}
        />
      )}

      {confirmPrint && (
        <ConfirmPrintModal
          order={confirmPrint}
          onPrint={() => { printOrder(confirmPrint); setConfirmPrint(null); }}
          onDismiss={() => setConfirmPrint(null)}
        />
      )}
    </div>
  );
}
