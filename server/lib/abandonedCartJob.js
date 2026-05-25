const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { sendAbandonedCartEmail } = require('./mailer');

/* Tiempo minimo de "abandono" — 1h sin actividad y sin orden. Suficiente
 * para descartar que el usuario solo este navegando, pero no tan largo que
 * el contexto se enfrie. */
const ABANDON_MS = 60 * 60 * 1000;

/* Tope por corrida — evita que si hay un pico de carts abandonados se manden
 * miles de emails de golpe y quemen la cuota free de SMTP/Brevo en un solo
 * batch. Si hay mas, el resto agarra la proxima corrida (1h despues). */
const BATCH_LIMIT = 30;

async function runAbandonedCartCheck() {
  const cutoff = new Date(Date.now() - ABANDON_MS);

  /* Carritos candidatos: con items, no convertidos, no notificados, ultimo
   * update >1h. Limitamos a BATCH_LIMIT por corrida. */
  const candidates = await Cart.find({
    convertedToOrder: false,
    recoveryEmailSentAt: null,
    updatedAt: { $lt: cutoff },
    'items.0': { $exists: true },
  })
    .sort({ updatedAt: 1 })
    .limit(BATCH_LIMIT)
    .lean();

  if (!candidates.length) return { scanned: 0, sent: 0 };

  /* Cross-check con Orders: si el cliente ya pidio desde el mismo email
   * en las ultimas 24h, no le mandamos el email (probablemente convirtio
   * pero el flag se perdio — race condition, o checkout sin email match). */
  const emails = candidates.map((c) => c.email);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOrders = await Order.find({
    'customer.email': { $in: emails },
    createdAt: { $gt: since },
  }).select('customer.email').lean();
  const recentEmails = new Set(
    recentOrders.map((o) => o.customer?.email?.toLowerCase?.()).filter(Boolean)
  );

  let sent = 0;
  for (const cart of candidates) {
    if (recentEmails.has(cart.email)) {
      /* Hay orden reciente — marcar como convertido y saltar */
      await Cart.updateOne({ _id: cart._id }, { $set: { convertedToOrder: true } });
      continue;
    }
    try {
      const result = await sendAbandonedCartEmail(cart);
      if (result?.ok) {
        await Cart.updateOne(
          { _id: cart._id },
          { $set: { recoveryEmailSentAt: new Date() } }
        );
        sent += 1;
      }
    } catch (err) {
      console.error(`[abandoned-cart] fallo enviar a ${cart.email}:`, err.message);
    }
  }

  return { scanned: candidates.length, sent };
}

/* Wrapper que se ejecuta en setInterval — captura errores para que un fallo
 * de DB no tumbe el setInterval (sin esto, una excepcion no manejada en el
 * timer hace que nunca mas vuelva a correr). */
function startAbandonedCartJob() {
  const INTERVAL_MS = 60 * 60 * 1000; /* 1 hora */

  const tick = async () => {
    try {
      const t0 = Date.now();
      const { scanned, sent } = await runAbandonedCartCheck();
      if (scanned > 0) {
        console.log(`[abandoned-cart] scan=${scanned} sent=${sent} en ${Date.now() - t0}ms`);
      }
    } catch (err) {
      console.error('[abandoned-cart] tick fallo:', err.message);
    }
  };

  /* Primera corrida 5 min despues de bootear el server — da tiempo a que
   * Mongo este conectado y evita correr durante un restart loop. */
  setTimeout(tick, 5 * 60 * 1000);
  setInterval(tick, INTERVAL_MS);

  console.log('[abandoned-cart] job programado: 1ra corrida en 5min, luego cada 1h');
}

module.exports = { startAbandonedCartJob, runAbandonedCartCheck };
