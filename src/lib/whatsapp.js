import { formatCRC } from './currency';
import { WHATSAPP_NUMBER } from '../data/products';

function variantSummary(v) {
  if (!v || typeof v !== 'object') return '';
  const parts = Object.entries(v)
    .filter(([k, val]) => k && val)
    .map(([k, val]) => `${k}: ${val}`);
  return parts.length ? ` (${parts.join(' · ')})` : '';
}

export function buildWhatsAppMessage(items, customer = null, orderNumber = null) {
  const lines = items.map(
    (i) => `  • ${i.name}${variantSummary(i.selectedVariants)} × ${i.qty}  —  ${formatCRC(i.price * i.qty)}`
  );
  const subtotal     = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingCost = Number(customer?.shippingCost) || 0;
  const discount     = Math.min(Number(customer?.coupon?.discount) || 0, subtotal);
  const total        = Math.max(0, subtotal - discount) + shippingCost;

  const parts = [
    '*★ NUEVO PEDIDO ★*',
    orderNumber ? `*Pedido #${orderNumber}*` : '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    '*PRODUCTOS*',
    ...lines,
    '',
    `Subtotal: ${formatCRC(subtotal)}`,
  ];

  if (customer?.coupon?.code) {
    const tag = customer.coupon.freeShipping ? ' (envío gratis)' : '';
    parts.push(`Cupón ${customer.coupon.code}${tag}: −${formatCRC(discount)}`);
  }
  if (customer?.shippingMethod) {
    parts.push(`Envío (${customer.shippingMethod}): ${shippingCost === 0 ? 'Gratis' : formatCRC(shippingCost)}`);
  }
  if (customer?.paymentMethod) {
    const label = customer.paymentMethod === 'sinpe' ? 'SINPE Móvil' : 'WhatsApp';
    parts.push(`Método de pago: ${label}`);
  }
  parts.push(`*TOTAL: ${formatCRC(total)}*`);

  parts.push('', '━━━━━━━━━━━━━━━━━━', '', '*DATOS DEL CLIENTE*');
  if (customer?.name)     parts.push(`Nombre: ${customer.name}`);
  if (customer?.phone)    parts.push(`WhatsApp: ${customer.phone}`);
  if (customer?.province) parts.push(`Provincia: ${customer.province}`);

  if (customer?.address || (customer?.lat && customer?.lng)) {
    parts.push('', '*DIRECCIÓN DE ENTREGA*');
    if (customer?.address) parts.push(customer.address);

    if (customer?.lat && customer?.lng) {
      const lat = Number(customer.lat).toFixed(6);
      const lng = Number(customer.lng).toFixed(6);
      parts.push('');
      parts.push('► Google Maps:');
      parts.push(`https://www.google.com/maps?q=${lat},${lng}`);
      parts.push('');
      parts.push('► Waze (navegación):');
      parts.push(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
    }
  }

  if (customer?.notes?.trim()) {
    parts.push('', '*NOTAS*', customer.notes.trim());
  }

  parts.push('', '━━━━━━━━━━━━━━━━━━');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(parts.join('\n'))}`;
}
