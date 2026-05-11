const nodemailer = require('nodemailer');

let _transporter = null;

/* ─── Resend (HTTP) ───
 * Render free plan bloquea todo outbound SMTP (puertos 25/465/587). La unica
 * forma confiable de enviar mails es por HTTPS. Resend es free hasta 100/dia
 * + 3000/mes, API muy simple. Si esta configurado, lo usamos primero. */
async function sendViaResend({ from, to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) return null; // no configurado → caer a SMTP
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { ok: false, reason: 'resend_failed', detail: err.slice(0, 300) };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data.id, via: 'resend' };
  } catch (err) {
    return { ok: false, reason: 'resend_error', detail: err.message };
  }
}

function resendFromAddress() {
  // Hasta verificar dominio, Resend permite usar onboarding@resend.dev para
  // pruebas. Override con RESEND_FROM si verificaste un dominio (ej:
  // 'JD Virtual <pedidos@jd-virtual.com>').
  return process.env.RESEND_FROM || 'JD Virtual <onboarding@resend.dev>';
}

/* Render free plan a veces bloquea el puerto 465 (SSL directo). Usamos por
 * default puerto 587 (STARTTLS) que es mas permisivo en hosting compartido.
 * Permitimos override via SMTP_HOST/SMTP_PORT/SMTP_SECURE para cualquier
 * proveedor (Brevo, Resend SMTP, SendGrid, Outlook, etc). */
function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,                 // false para 587 (STARTTLS), true para 465 (SSL)
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // Timeouts cortos para no colgar la response durante 30s+ si el puerto
    // esta bloqueado por el hosting (sintoma tipico: Connection timeout).
    connectionTimeout: 10_000,
    greetingTimeout:   10_000,
    socketTimeout:     15_000,
    // Habilita STARTTLS cuando secure=false (estandar para Gmail 587)
    requireTLS: !secure,
  });
  return _transporter;
}

/* Diagnostico SMTP — devuelve por que el mailer no funcionaria. */
function smtpStatus() {
  const hasUser = !!process.env.SMTP_USER;
  const hasPass = !!process.env.SMTP_PASS;
  if (!hasUser || !hasPass) {
    return {
      ok: false,
      reason: 'env_missing',
      detail: `Faltan en el servidor: ${[!hasUser && 'SMTP_USER', !hasPass && 'SMTP_PASS'].filter(Boolean).join(', ')}`,
      hasUser, hasPass,
    };
  }
  return { ok: true, hasUser: true, hasPass: true, user: process.env.SMTP_USER };
}

/* Verifica que la cuenta SMTP esta lista para enviar (verify ping).
 * Distingue entre auth fail (credenciales mal) y timeout (puerto bloqueado). */
async function verifySmtp() {
  const status = smtpStatus();
  if (!status.ok) return status;
  try {
    const t = getTransporter();
    await t.verify();
    return {
      ok: true,
      user: process.env.SMTP_USER,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
    };
  } catch (err) {
    const msg = String(err.message || err);
    let reason = 'auth_failed';
    if (/timeout|ETIMEDOUT|ECONNREFUSED|ENETUNREACH/i.test(msg)) reason = 'connection_timeout';
    else if (/authentication|invalid login|535/i.test(msg)) reason = 'auth_failed';
    return { ok: false, reason, detail: msg };
  }
}

const fmt = (n) => `₡${Number(n || 0).toLocaleString('es-CR')}`;

function buildOrderHtml(order) {
  const rows = (order.items || []).map((i) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f5eded;font-size:14px;color:#333">${i.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f5eded;text-align:center;font-size:14px;color:#555">${i.qty}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f5eded;text-align:right;font-size:14px;font-weight:600;color:#333">${fmt(i.price * i.qty)}</td>
    </tr>
  `).join('');

  const createdAt = new Date(order.createdAt).toLocaleString('es-CR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Nuevo pedido</title></head>
<body style="margin:0;padding:0;background:#f8f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4f4;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr>
          <td style="background:#B85F72;padding:28px 32px;text-align:center">
            <p style="margin:0;color:#fff;font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.8">JD Virtual Store</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:bold;letter-spacing:1px">
              Nuevo pedido
            </h1>
            <p style="margin:8px 0 0;color:#f5d0d8;font-size:20px;font-weight:bold;font-family:monospace">${order.orderNumber}</p>
            <p style="margin:6px 0 0;color:#f5d0d8;font-size:12px">${createdAt}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">

            <!-- Cliente -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f8;border:1px solid #f0e8e8;border-radius:10px;margin-bottom:20px">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f0e8e8">
                  <p style="margin:0;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#B85F72">Cliente</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px">
                  <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#222">${order.customer?.name || ''}</p>
                  <p style="margin:0 0 4px;font-size:14px;color:#555">📞 ${order.customer?.phone || ''}</p>
                  <p style="margin:0 0 4px;font-size:14px;color:#555">📍 ${order.customer?.address || ''}, ${order.customer?.province || ''}</p>
                  <p style="margin:8px 0 0;font-size:12px;color:#999">Método de envío: ${order.shippingMethod || 'correos'}</p>
                  ${order.customer?.notes ? `<p style="margin:6px 0 0;font-size:13px;color:#666;font-style:italic">Nota: ${order.customer.notes}</p>` : ''}
                </td>
              </tr>
            </table>

            <!-- Productos -->
            <p style="margin:0 0 10px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#888">Productos</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8e8;border-radius:10px;overflow:hidden;margin-bottom:20px">
              <thead>
                <tr style="background:#fdf8f8">
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Producto</th>
                  <th style="padding:10px 14px;text-align:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Cant.</th>
                  <th style="padding:10px 14px;text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <!-- Totales -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8e8;border-radius:10px;overflow:hidden;margin-bottom:24px">
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#666;border-bottom:1px solid #f5eded">Subtotal</td>
                <td style="padding:10px 16px;font-size:14px;color:#333;text-align:right;border-bottom:1px solid #f5eded">${fmt(order.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#666;border-bottom:1px solid #f5eded">Envío</td>
                <td style="padding:10px 16px;font-size:14px;color:#333;text-align:right;border-bottom:1px solid #f5eded">${order.shippingCost ? fmt(order.shippingCost) : 'Gratis'}</td>
              </tr>
              ${order.discount > 0 ? `
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#16a34a;border-bottom:1px solid #f5eded">Descuento ${order.coupon?.code ? '(' + order.coupon.code + ')' : ''}</td>
                <td style="padding:10px 16px;font-size:14px;color:#16a34a;text-align:right;border-bottom:1px solid #f5eded">-${fmt(order.discount)}</td>
              </tr>` : ''}
              <tr style="background:#fdf8f8">
                <td style="padding:14px 16px;font-size:16px;font-weight:bold;color:#222">TOTAL</td>
                <td style="padding:14px 16px;font-size:20px;font-weight:bold;color:#B85F72;text-align:right">${fmt(order.total)}</td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/ordenes"
                style="display:inline-block;background:#B85F72;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:bold;letter-spacing:.5px">
                Ver pedido en el panel
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fdf8f8;padding:16px 32px;text-align:center;border-top:1px solid #f0e8e8">
            <p style="margin:0;font-size:12px;color:#bbb">JD Virtual Store · Notificación automática</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendOrderNotification(order, toEmail) {
  if (!toEmail) {
    console.warn(`⚠️  sendOrderNotification: no hay email destino (Settings.notificationEmail)`);
    return { ok: false, reason: 'no_recipient' };
  }

  const subject = `🛍️ Nuevo pedido ${order.orderNumber} — ${order.customer?.name || ''}`;
  const html = buildOrderHtml(order);

  // Intento 1: Resend (HTTPS, funciona en Render)
  const resend = await sendViaResend({ from: resendFromAddress(), to: toEmail, subject, html });
  if (resend?.ok) {
    console.log(`📧 [Resend] Admin notificado: ${toEmail} pedido ${order.orderNumber}`);
    return { ok: true, to: toEmail, via: 'resend' };
  }
  if (resend && !resend.ok) {
    console.warn(`⚠️  Resend fallo (${resend.reason}): ${resend.detail || ''} — intentando SMTP`);
  }

  // Intento 2: SMTP fallback
  const t = getTransporter();
  if (!t) {
    console.warn(`⚠️  Sin Resend y sin SMTP. Email no enviado.`);
    return { ok: false, reason: 'no_provider_configured' };
  }
  try {
    await t.sendMail({
      from: `"JD Virtual" <${process.env.SMTP_USER}>`,
      to:   toEmail,
      subject,
      html,
    });
    console.log(`📧 [SMTP] Admin notificado: ${toEmail} pedido ${order.orderNumber}`);
    return { ok: true, to: toEmail, via: 'smtp' };
  } catch (err) {
    console.error('❌ SMTP fallo también:', err.message);
    return { ok: false, reason: 'send_failed', detail: err.message };
  }
}

/* ── Email de confirmación al cliente ── */
function buildConfirmationHtml(order) {
  const rows = (order.items || []).map((i) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f5eded;font-size:14px;color:#333">${i.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f5eded;text-align:center;font-size:14px;color:#555">${i.qty}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f5eded;text-align:right;font-size:14px;font-weight:600;color:#333">${fmt(i.price * i.qty)}</td>
    </tr>
  `).join('');

  const firstName = (order.customer?.name || '').split(' ')[0];
  const trackUrl  = `${process.env.CLIENT_URL || 'http://localhost:5173'}/pedido/${order.orderNumber}`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Pedido recibido</title></head>
<body style="margin:0;padding:0;background:#f8f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4f4;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr>
          <td style="background:#B85F72;padding:32px;text-align:center">
            <p style="margin:0;color:#fff;font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.8">JD Virtual Store</p>
            <h1 style="margin:10px 0 0;color:#fff;font-size:26px;font-weight:bold">¡Tu pedido fue recibido!</h1>
            <p style="margin:10px 0 0;color:#f5d0d8;font-size:20px;font-weight:bold;font-family:monospace">${order.orderNumber}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px">

            <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.6">
              Hola <strong>${firstName}</strong>, gracias por tu compra 🌸<br>
              Recibimos tu pedido y nos pondremos en contacto pronto para coordinar el pago y el envío.
            </p>

            <!-- Productos -->
            <p style="margin:0 0 10px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;color:#888">Tu pedido</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8e8;border-radius:10px;overflow:hidden;margin-bottom:20px">
              <thead>
                <tr style="background:#fdf8f8">
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Producto</th>
                  <th style="padding:10px 14px;text-align:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Cant.</th>
                  <th style="padding:10px 14px;text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <!-- Totales -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8e8;border-radius:10px;overflow:hidden;margin-bottom:24px">
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#666;border-bottom:1px solid #f5eded">Subtotal</td>
                <td style="padding:10px 16px;font-size:14px;color:#333;text-align:right;border-bottom:1px solid #f5eded">${fmt(order.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#666;border-bottom:1px solid #f5eded">Envío</td>
                <td style="padding:10px 16px;font-size:14px;color:#333;text-align:right;border-bottom:1px solid #f5eded">${order.shippingCost ? fmt(order.shippingCost) : 'Por coordinar'}</td>
              </tr>
              ${order.discount > 0 ? `
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#16a34a;border-bottom:1px solid #f5eded">Descuento</td>
                <td style="padding:10px 16px;font-size:14px;color:#16a34a;text-align:right;border-bottom:1px solid #f5eded">-${fmt(order.discount)}</td>
              </tr>` : ''}
              <tr style="background:#fdf8f8">
                <td style="padding:14px 16px;font-size:16px;font-weight:bold;color:#222">TOTAL</td>
                <td style="padding:14px 16px;font-size:20px;font-weight:bold;color:#B85F72;text-align:right">${fmt(order.total)}</td>
              </tr>
            </table>

            <!-- Rastreo -->
            <div style="text-align:center;background:#fdf8f8;border:1px solid #f0e8e8;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="margin:0 0 6px;font-size:13px;color:#888">Podés rastrear el estado de tu pedido aquí:</p>
              <a href="${trackUrl}" style="font-family:monospace;font-size:16px;font-weight:bold;color:#B85F72;text-decoration:none">${order.orderNumber}</a><br>
              <a href="${trackUrl}" style="display:inline-block;margin-top:12px;background:#B85F72;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:bold">
                Ver estado del pedido →
              </a>
            </div>

            <p style="margin:0;font-size:13px;color:#888;line-height:1.6;text-align:center">
              ¿Tenés alguna consulta? Escribinos por WhatsApp y con gusto te ayudamos.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fdf8f8;padding:16px 32px;text-align:center;border-top:1px solid #f0e8e8">
            <p style="margin:0;font-size:12px;color:#bbb">JD Virtual Store · Gracias por tu compra 🌸</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const STATUS_MESSAGES = {
  confirmado: {
    emoji:  '✅',
    titulo: 'Tu pedido fue confirmado',
    cuerpo: 'Ya confirmamos tu pedido. Estamos preparando todo para que llegue perfecto.',
  },
  preparando: {
    emoji:  '📦',
    titulo: 'Estamos preparando tu pedido',
    cuerpo: 'Tu pedido está siendo armado con mucho cuidado. Pronto lo enviamos.',
  },
  enviado: {
    emoji:  '🚚',
    titulo: '¡Tu pedido va en camino!',
    cuerpo: 'Tu pedido ya fue enviado. Dependiendo del método de envío podría tardar entre 1 y 5 días hábiles.',
  },
  entregado: {
    emoji:  '🎉',
    titulo: '¡Tu pedido fue entregado!',
    cuerpo: 'Esperamos que estés feliz con tu compra. Si tenés alguna consulta, estamos para ayudarte.',
  },
  cancelado: {
    emoji:  '❌',
    titulo: 'Tu pedido fue cancelado',
    cuerpo: 'Tu pedido fue cancelado. Si tenés alguna duda comunícate con nosotros por WhatsApp.',
  },
};

function buildStatusHtml(order, newStatus) {
  const firstName = (order.customer?.name || '').split(' ')[0];
  const msg       = STATUS_MESSAGES[newStatus];
  if (!msg) return null;

  const trackUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/pedido/${order.orderNumber}`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Actualización de pedido</title></head>
<body style="margin:0;padding:0;background:#f8f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4f4;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

        <tr>
          <td style="background:#B85F72;padding:32px;text-align:center">
            <p style="margin:0;color:#fff;font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.8">JD Virtual Store</p>
            <p style="margin:12px 0 0;font-size:40px">${msg.emoji}</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:bold">${msg.titulo}</h1>
            <p style="margin:8px 0 0;color:#f5d0d8;font-size:16px;font-family:monospace">${order.orderNumber}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;text-align:center">
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7">
              Hola <strong>${firstName}</strong>,<br>${msg.cuerpo}
            </p>

            <a href="${trackUrl}" style="display:inline-block;background:#B85F72;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:bold;letter-spacing:.5px">
              Ver estado del pedido →
            </a>

            <p style="margin:24px 0 0;font-size:12px;color:#aaa">
              ¿Tenés alguna consulta? Respondé este correo o escribinos por WhatsApp.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#fdf8f8;padding:16px 32px;text-align:center;border-top:1px solid #f0e8e8">
            <p style="margin:0;font-size:12px;color:#bbb">JD Virtual Store · Notificación automática</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendCustomerConfirmation(order) {
  const email = order.customer?.email;
  if (!email) {
    console.warn(`⚠️  sendCustomerConfirmation: el pedido ${order.orderNumber} no tiene email del cliente`);
    return { ok: false, reason: 'no_customer_email' };
  }

  const subject = `Tu pedido ${order.orderNumber} fue recibido — JD Virtual`;
  const html    = buildConfirmationHtml(order);

  const resend = await sendViaResend({ from: resendFromAddress(), to: email, subject, html });
  if (resend?.ok) {
    console.log(`📧 [Resend] Confirmación a cliente: ${email}`);
    return { ok: true, to: email, via: 'resend' };
  }
  if (resend && !resend.ok) {
    console.warn(`⚠️  Resend fallo: ${resend.detail || resend.reason} — intentando SMTP`);
  }

  const t = getTransporter();
  if (!t) return { ok: false, reason: 'no_provider_configured' };
  try {
    await t.sendMail({
      from:    `"JD Virtual" <${process.env.SMTP_USER}>`,
      to:      email,
      subject,
      html,
    });
    console.log(`📧 [SMTP] Confirmación a cliente: ${email}`);
    return { ok: true, to: email, via: 'smtp' };
  } catch (err) {
    console.error('❌ SMTP fallo:', err.message);
    return { ok: false, reason: 'send_failed', detail: err.message };
  }
}

async function sendCustomerStatusUpdate(order, newStatus) {
  const email = order.customer?.email;
  if (!email) {
    console.warn(`⚠️  sendCustomerStatusUpdate: pedido ${order.orderNumber} sin email`);
    return { ok: false, reason: 'no_customer_email' };
  }

  const html = buildStatusHtml(order, newStatus);
  if (!html) {
    return { ok: false, reason: 'no_template', detail: `Sin plantilla para "${newStatus}" (probablemente "pendiente")` };
  }

  const SUBJECTS = {
    confirmado: `Tu pedido ${order.orderNumber} fue confirmado`,
    preparando: `Estamos preparando tu pedido ${order.orderNumber}`,
    enviado:    `Tu pedido ${order.orderNumber} va en camino`,
    entregado:  `Tu pedido ${order.orderNumber} fue entregado`,
    cancelado:  `Tu pedido ${order.orderNumber} fue cancelado`,
  };
  const subject = SUBJECTS[newStatus] || `Actualización de tu pedido ${order.orderNumber}`;

  const resend = await sendViaResend({ from: resendFromAddress(), to: email, subject, html });
  if (resend?.ok) {
    console.log(`📧 [Resend] Estado "${newStatus}" → ${email}`);
    return { ok: true, to: email, via: 'resend' };
  }
  if (resend && !resend.ok) {
    console.warn(`⚠️  Resend fallo: ${resend.detail || resend.reason} — intentando SMTP`);
  }

  const t = getTransporter();
  if (!t) return { ok: false, reason: 'no_provider_configured' };
  try {
    await t.sendMail({
      from:    `"JD Virtual" <${process.env.SMTP_USER}>`,
      to:      email,
      subject,
      html,
    });
    console.log(`📧 [SMTP] Estado "${newStatus}" → ${email}`);
    return { ok: true, to: email, via: 'smtp' };
  } catch (err) {
    console.error('❌ SMTP fallo:', err.message);
    return { ok: false, reason: 'send_failed', detail: err.message };
  }
}

module.exports = {
  sendOrderNotification,
  sendCustomerConfirmation,
  sendCustomerStatusUpdate,
  smtpStatus,
  verifySmtp,
};
