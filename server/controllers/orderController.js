const Order    = require('../models/Order');
const Coupon   = require('../models/Coupon');
const Product  = require('../models/Product');
const Settings = require('../models/Settings');
const { broadcast } = require('../lib/sse');
const { sendOrderNotification, sendCustomerConfirmation, sendCustomerStatusUpdate, sendTestEmail, smtpStatus, verifySmtp } = require('../lib/mailer');

/* ---------- Public ---------- */

const ALLOWED_SHIPPING_METHODS = ['correos', 'express', 'retiro'];

exports.create = async (req, res, next) => {
  try {
    const {
      customer,
      items,
      shippingMethod = 'correos',
      coupon: couponData = null,
    } = req.body;

    /* ── Basic shape validation ── */
    if (!customer || !items?.length) {
      return res.status(400).json({ error: 'Datos del pedido incompletos' });
    }
    if (!ALLOWED_SHIPPING_METHODS.includes(shippingMethod)) {
      return res.status(400).json({ error: 'Método de envío inválido' });
    }
    if (items.length > 50) {
      return res.status(400).json({ error: 'Demasiados artículos en el pedido' });
    }

    /* ── Fetch settings + validate shipping cost from DB (never trust client) ── */
    const settings    = await Settings.findOne({ key: 'main' });
    const autoConfirm = settings?.autoConfirmOrders !== false;

    /* ── Re-price every item from the database — never trust client prices ── */
    const productIds = items
      .filter((i) => i.productId)
      .map((i) => i.productId);

    const dbProducts = productIds.length
      ? await Product.find({ _id: { $in: productIds } }).select('_id price stock isActive images')
      : [];

    const priceMap = Object.fromEntries(dbProducts.map((p) => [String(p._id), p]));

    let subtotal = 0;
    const validatedItems = [];

    // Sanea selectedVariants: solo aceptar objeto plano { string: string },
    // recortando claves/valores a 60 chars y maximo 6 entradas. Evita que el
    // cliente meta payloads grandes o tipos inesperados en Mongo.
    const sanitizeVariants = (v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
      const entries = Object.entries(v)
        .filter(([k, val]) => typeof k === 'string' && typeof val === 'string' && k && val)
        .slice(0, 6)
        .map(([k, val]) => [String(k).slice(0, 60), String(val).slice(0, 60)]);
      if (!entries.length) return undefined;
      return Object.fromEntries(entries);
    };

    for (const item of items) {
      const qty = Math.max(1, Math.round(Number(item.qty) || 1));
      const selectedVariants = sanitizeVariants(item.selectedVariants);

      if (item.productId) {
        const dbProd = priceMap[String(item.productId)];
        if (!dbProd) return res.status(400).json({ error: `Producto no encontrado: ${item.productId}` });
        if (dbProd.isActive === false) return res.status(400).json({ error: `Producto no disponible: ${item.name}` });
        // Always use the real price from the database. Tambien usar la imagen
        // del DB como fallback si el cliente mando string vacio o no la mando
        // — es la unica fuente confiable independiente de como el cliente
        // serializo el producto en el carrito.
        const dbImage = Array.isArray(dbProd.images) && dbProd.images[0] ? dbProd.images[0] : '';
        subtotal += dbProd.price * qty;
        validatedItems.push({
          ...item,
          price: dbProd.price,
          qty,
          image: item.image || dbImage,
          selectedVariants,
        });
      } else {
        // Item without productId (e.g., local data fallback) — use client price only in dev
        const price = Number(item.price) || 0;
        subtotal += price * qty;
        validatedItems.push({ ...item, price, qty, selectedVariants });
      }
    }

    /* ── Server-side shipping cost (never trust client) ── */
    let rawShippingCost = 0;
    if (shippingMethod === 'retiro') {
      rawShippingCost = 0;
    } else if (shippingMethod === 'express') {
      rawShippingCost = settings?.shippingCostExpress ?? 4500;
    } else {
      // correos — check if free shipping threshold met
      const freeFrom = settings?.freeShippingFrom ?? 25000;
      rawShippingCost = subtotal >= freeFrom ? 0 : (settings?.shippingCostCorreos ?? 2500);
    }

    /* ── Re-validate coupon server-side — never trust client-sent discount ── */
    let discount     = 0;
    let freeShipping = false;
    let appliedCode  = null;

    if (couponData?.code) {
      const code = String(couponData.code).trim().toUpperCase().slice(0, 30);
      const claimed = await Coupon.findOneAndUpdate(
        {
          code,
          isActive: true,
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
          $expr: {
            $or: [
              { $eq: ['$maxUses', 0] },
              { $lt: ['$usedCount', '$maxUses'] },
            ],
          },
        },
        { $inc: { usedCount: 1 } },
        { new: true }
      );

      if (claimed && subtotal >= (claimed.minOrder || 0)) {
        discount     = claimed.computeDiscount(subtotal, rawShippingCost);
        freeShipping = claimed.type === 'shipping';
        appliedCode  = claimed.code;
      } else if (claimed) {
        await Coupon.updateOne({ _id: claimed._id }, { $inc: { usedCount: -1 } });
      }
    }

    const shippingCost = freeShipping ? 0 : rawShippingCost;
    const total        = Math.max(0, subtotal - discount) + shippingCost;

    const initialStatus = autoConfirm ? 'confirmado' : 'pendiente';

    // Fallback: si el cliente no escribio email en el form pero esta logueado,
    // usar el email de su cuenta. Sin esto, sendCustomerConfirmation no tiene
    // a quien escribirle y la confirmacion al cliente nunca sale.
    if (!customer.email && req.user?.email) {
      customer.email = req.user.email;
    }

    const order = await Order.create({
      customer,
      userId: req.user?.id || null,
      items: validatedItems,
      subtotal,
      discount,
      coupon: appliedCode
        ? { code: appliedCode, discount, freeShipping }
        : undefined,
      shippingCost,
      total,
      shippingMethod,
      status:       initialStatus,
      whatsappSent: true,
    });

    // Decrement stock for each item (only if stock is tracked, never below 0).
    // Also flag any product that crossed into the "low stock" zone (≤3) or hit
    // 0 so the admin gets pinged in real-time and can restock proactively.
    const updatedProducts = await Promise.all(
      items.map((item) =>
        item.productId
          ? Product.findOneAndUpdate(
              { _id: item.productId, stock: { $gt: 0 } },
              { $inc: { stock: -Math.abs(item.qty) } },
              { new: true }
            )
          : null
      )
    );
    for (const p of updatedProducts) {
      if (!p || typeof p.stock !== 'number') continue;
      if (p.stock === 0) {
        broadcast('out-of-stock', { productId: String(p._id), name: p.name, slug: p.slug });
      } else if (p.stock <= 3) {
        broadcast('low-stock', { productId: String(p._id), name: p.name, slug: p.slug, stock: p.stock });
      }
    }

    broadcast('new-order', { orderNumber: order.orderNumber, customer: customer.name });

    // Emails sin bloquear la respuesta
    Settings.findOne({ key: 'main' })
      .then((s) => { if (s?.notificationEmail) sendOrderNotification(order, s.notificationEmail); })
      .catch(() => {});

    sendCustomerConfirmation(order).catch(() => {});

    res.status(201).json({ orderNumber: order.orderNumber, id: order._id });
  } catch (err) {
    console.error('❌ create order error:', err.name, err.message, JSON.stringify(err.errors || ''));
    next(err);
  }
};

exports.getByNumber = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.number });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ orderNumber: order.orderNumber, status: order.status, total: order.total, createdAt: order.createdAt });
  } catch (err) { next(err); }
};

/* ---------- Admin ---------- */

exports.adminGetAll = async (req, res, next) => {
  try {
    const { status, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { orderNumber: rx },
        { 'customer.name': rx },
        { 'customer.phone': rx },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'email name picture')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.adminGetOne = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'email name picture createdAt');
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(order);
  } catch (err) { next(err); }
};

/* Diagnostico del SMTP — admin puede ver por que no se envian emails.
 * GET con ?test=email@ejemplo.com hace un envio de prueba real. */
exports.smtpDiagnostic = async (req, res, next) => {
  try {
    const hasResend = !!process.env.RESEND_API_KEY;
    const hasBrevo  = !!process.env.BREVO_API_KEY;
    const status = smtpStatus();
    const pref = String(process.env.EMAIL_PROVIDER || '').toLowerCase();

    // Calcular el orden real de intento segun EMAIL_PROVIDER y lo configurado
    const order = (() => {
      if (pref === 'smtp')   return ['smtp', 'resend', 'brevo'];
      if (pref === 'resend') return ['resend', 'smtp', 'brevo'];
      if (pref === 'brevo')  return ['brevo', 'resend', 'smtp'];
      if (status.ok)         return ['smtp', 'resend', 'brevo'];
      if (hasBrevo)          return ['brevo', 'resend', 'smtp'];
      return ['resend', 'brevo', 'smtp'];
    })().filter((p) => {
      if (p === 'smtp')   return status.ok;
      if (p === 'resend') return hasResend;
      if (p === 'brevo')  return hasBrevo;
      return false;
    });

    if (order.length === 0) {
      return res.json({
        ok: false,
        provider: 'none',
        message: 'Ningun proveedor de email esta configurado.',
        howToFix: [
          'OPCION A (Brevo HTTP, sin dominio) — crear cuenta en brevo.com, verificar tu Gmail como sender, generar API key. Agregar BREVO_API_KEY + BREVO_SENDER_EMAIL en Render. 300/dia gratis y deja enviar a cualquier cliente.',
          'OPCION B (Resend HTTP) — solo funciona enviando a tu propio email salvo que verifiques un dominio. Agregar RESEND_API_KEY en Render.',
          'OPCION C (Gmail SMTP) — SMTP_USER + SMTP_PASS (App Password) en Render. Atencion: Render free bloquea outbound SMTP, da Connection timeout.',
          'Para preferir un proveedor: EMAIL_PROVIDER=brevo|resend|smtp en Render.',
        ],
      });
    }

    // Brevo configurado y preferido = no necesitamos SMTP. Reportar directo.
    if (order[0] === 'brevo') {
      const settings = await Settings.findOne({ key: 'main' });
      const notifTo = settings?.notificationEmail || null;
      const senderEmail = process.env.BREVO_SENDER_EMAIL;
      return res.json({
        ok: !!senderEmail,
        providerOrder: order,
        primary: 'brevo',
        from: senderEmail ? `${process.env.BREVO_SENDER_NAME || 'JD Virtual'} <${senderEmail}>` : '(falta BREVO_SENDER_EMAIL)',
        notificationEmail: notifTo,
        message: !senderEmail
          ? 'Brevo tiene API key pero falta BREVO_SENDER_EMAIL en Render — los emails no van a salir. Agregá la var con el Gmail que verificaste en Brevo.'
          : notifTo
            ? `Brevo configurado. Las notificaciones de pedidos llegan a ${notifTo}. Los clientes reciben sus confirmaciones sin problemas.`
            : 'Brevo configurado pero NO hay notificationEmail en /admin/config — los avisos al admin no llegan.',
      });
    }

    // Resend ya configurado y es el preferido = no necesitamos SMTP. Reportar directo.
    if (order[0] === 'resend') {
      const settings = await Settings.findOne({ key: 'main' });
      const notifTo = settings?.notificationEmail || null;
      return res.json({
        ok: true,
        providerOrder: order,
        primary: 'resend',
        from: process.env.RESEND_FROM || 'JD Virtual <onboarding@resend.dev>',
        notificationEmail: notifTo,
        message: notifTo
          ? `Resend configurado. Las notificaciones de pedidos llegan a ${notifTo}.${order.includes('smtp') ? ' SMTP queda como fallback.' : ''}`
          : 'Resend configurado pero NO hay notificationEmail en /admin/config — los avisos al admin no llegan.',
      });
    }

    if (!status.ok) {
      return res.json({
        ok: false,
        provider: 'none',
        message: 'Ningun proveedor de email esta configurado.',
        howToFix: [
          'OPCION RECOMENDADA: Crear cuenta gratis en https://resend.com, generar un API key y agregar RESEND_API_KEY en Render Environment. 100 emails/dia gratis, funciona en Render sin problemas.',
          'OPCION ALTERNATIVA: SMTP de Gmail — agregar SMTP_USER + SMTP_PASS (App Password) en Render. Render free a veces bloquea puertos SMTP outbound, asi que puede no funcionar.',
        ],
      });
    }
    // Verificar credenciales con un ping
    const verify = await verifySmtp();
    if (!verify.ok) {
      let message, howToFix;
      if (verify.reason === 'connection_timeout') {
        message = 'No se puede conectar al servidor SMTP — el puerto esta bloqueado o el host no responde.';
        howToFix = 'En Render free plan, el puerto 465 a veces esta bloqueado. Probá agregar estas env vars: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587. O usá un servicio HTTP como Resend (https://resend.com) o Brevo (https://brevo.com) que no dependen de SMTP — te doy un commit listo si querés.';
      } else if (verify.reason === 'auth_failed') {
        message = 'SMTP responde pero las credenciales no funcionan.';
        howToFix = 'Generá un App Password en https://myaccount.google.com/apppasswords y poné ese en SMTP_PASS (no tu contraseña normal de Gmail). Necesitás tener verificación en 2 pasos activada en la cuenta.';
      } else {
        message = 'SMTP no responde como se espera.';
        howToFix = 'Revisá los logs de Render para mas detalle.';
      }
      return res.json({
        ok: false,
        smtp: { configured: true, ...verify },
        message,
        howToFix,
      });
    }
    // Settings.notificationEmail (donde llega el aviso al admin)
    const settings = await Settings.findOne({ key: 'main' });
    const notifTo = settings?.notificationEmail || null;

    // Si pasaron ?test=email@dominio, mandar uno de prueba REAL usando la
    // misma cadena de proveedores que los pedidos. Antes esto usaba SMTP
    // directo y mentia diciendo 'ok' aunque Render bloqueara el envio.
    const testTo = String(req.query.test || '').trim();
    let testResult = null;
    if (testTo) {
      const r = await sendTestEmail(testTo);
      testResult = r.ok
        ? { ok: true, to: testTo, via: r.via }
        : { ok: false, error: r.detail || r.reason || 'desconocido' };
    }

    res.json({
      ok: true,
      smtp: { user: process.env.SMTP_USER, verified: true },
      notificationEmail: notifTo,
      message: notifTo
        ? `SMTP funciona. Las notificaciones de nuevos pedidos llegan a ${notifTo}.`
        : 'SMTP funciona pero NO hay notificationEmail configurado en Settings → no llegan avisos de nuevos pedidos al admin. Configurálo en /admin/config.',
      ...(testResult ? { testEmail: testResult } : {}),
    });
  } catch (err) { next(err); }
};

/* Backfill: rellenar customer.email en ordenes donde quedo vacio pero el
 * usuario logueado tiene email registrado. One-shot admin tool. */
exports.backfillCustomerEmails = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const orders = await Order.find({
      $or: [{ 'customer.email': '' }, { 'customer.email': { $exists: false } }],
      userId: { $ne: null },
    });
    if (orders.length === 0) return res.json({ updated: 0, message: 'Nada que rellenar' });

    const userIds = [...new Set(orders.map((o) => String(o.userId)))];
    const users = await User.find({ _id: { $in: userIds } }).select('_id email');
    const emailById = new Map(users.map((u) => [String(u._id), u.email]));

    let updated = 0;
    for (const o of orders) {
      const email = emailById.get(String(o.userId));
      if (email) {
        o.customer.email = email;
        await o.save();
        updated += 1;
      }
    }
    res.json({ updated, scanned: orders.length });
  } catch (err) { next(err); }
};

/* Backfill: rellenar items[].image en ordenes viejas usando la imagen actual
 * del producto. One-shot admin tool — idempotente, solo toca items con
 * image vacio y productId valido. */
exports.backfillItemImages = async (req, res, next) => {
  try {
    const orders = await Order.find({ 'items.image': { $in: ['', null] } });
    if (orders.length === 0) return res.json({ updated: 0, message: 'Nada que rellenar' });

    // Coleccionar todos los productIds que necesitamos
    const idsToFetch = new Set();
    for (const o of orders) {
      for (const it of o.items) {
        if ((!it.image || it.image === '') && it.productId) idsToFetch.add(String(it.productId));
      }
    }
    const products = await Product.find({ _id: { $in: [...idsToFetch] } }).select('_id images');
    const imageById = new Map();
    for (const p of products) {
      if (Array.isArray(p.images) && p.images[0]) imageById.set(String(p._id), p.images[0]);
    }

    let updated = 0;
    let itemsFixed = 0;
    for (const o of orders) {
      let dirty = false;
      for (const it of o.items) {
        if (!it.image && it.productId) {
          const img = imageById.get(String(it.productId));
          if (img) { it.image = img; itemsFixed += 1; dirty = true; }
        }
      }
      if (dirty) { await o.save(); updated += 1; }
    }
    res.json({ updated, itemsFixed, scanned: orders.length });
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

    const before = await Order.findById(req.params.id);
    if (!before) return res.status(404).json({ error: 'Pedido no encontrado' });

    const statusChanged = before.status !== status;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });

    // Refund coupon usage if cancelling; re-consume if un-cancelling.
    if (before.coupon?.code && statusChanged) {
      if (status === 'cancelado' && before.status !== 'cancelado') {
        await Coupon.updateOne(
          { code: before.coupon.code, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      } else if (before.status === 'cancelado' && status !== 'cancelado') {
        await Coupon.updateOne(
          { code: before.coupon.code },
          { $inc: { usedCount: 1 } }
        );
      }
    }

    // Solo intentar email si el estado realmente cambio (evita duplicados al
    // hacer click en el mismo estado dos veces). Esperamos el resultado para
    // devolver al admin si el envio salio OK o por que fallo.
    let emailResult = null;
    if (statusChanged) {
      emailResult = await sendCustomerStatusUpdate(order, status).catch((err) => ({
        ok: false, reason: 'unhandled', detail: err.message,
      }));
    } else {
      emailResult = { ok: false, reason: 'status_unchanged', detail: 'El estado ya era el mismo, no se reenvio email' };
    }

    res.json({ ...order.toObject(), _email: emailResult });
  } catch (err) { next(err); }
};

exports.chart = async (req, res, next) => {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Build array of last 14 days so we can compare this week vs prev week
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });

    const from = days[0];
    const to   = new Date(today); to.setDate(to.getDate() + 1);

    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to }, status: { $ne: 'cancelado' } } },
      {
        $group: {
          _id:      { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '-06:00' } },
          revenue:  { $sum: '$total' },
          orders:   { $sum: 1 },
        },
      },
    ]);

    const map = Object.fromEntries(rows.map((r) => [r._id, { revenue: r.revenue, orders: r.orders }]));

    const result = days.map((d) => {
      const key = d.toISOString().slice(0, 10);
      return { date: key, revenue: map[key]?.revenue || 0, orders: map[key]?.orders || 0 };
    });

    res.json(result);
  } catch (err) { next(err); }
};

exports.topProducts = async (req, res, next) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelado' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id:      '$items.name',
          units:    { $sum: '$items.qty' },
          revenue:  { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]);

    res.json(rows.map((r) => ({ name: r._id, units: r.units, revenue: r.revenue })));
  } catch (err) { next(err); }
};

exports.bulkUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    const allowed = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];
    if (!allowed.includes(status) || !Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    const result = await Order.updateMany({ _id: { $in: ids } }, { status });
    res.json({ updated: result.modifiedCount });
  } catch (err) { next(err); }
};

exports.updateNotes = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { internalNotes: req.body.notes ?? '' },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ internalNotes: order.internalNotes });
  } catch (err) { next(err); }
};

exports.stats = async (req, res, next) => {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const [totalOrders, todayOrders, weekRevenue, statusCounts] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: weekStart }, status: { $ne: 'cancelado' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    res.json({
      totalOrders,
      todayOrders,
      weekRevenue: weekRevenue[0]?.total || 0,
      statusCounts: Object.fromEntries(statusCounts.map(({ _id, count }) => [_id, count])),
    });
  } catch (err) { next(err); }
};
