const Cart = require('../models/Cart');

/* POST /api/cart/save
 *
 * Upserta el carrito del cliente identificado por email. Llamado desde el
 * checkout cuando el usuario completa el campo email — capturamos el cart
 * para poder enviarle una recuperacion si abandona.
 *
 * Reseteamos recoveryEmailSentAt si el cliente sigue interactuando (sigue
 * agregando productos despues de recibir el email). No reseteamos
 * convertedToOrder — ese se setea solo desde orderController al crear.
 */
exports.save = async (req, res, next) => {
  try {
    const { email, items, name, userId } = req.body;
    if (!email || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'email + items requeridos' });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'email invalido' });
    }
    /* Limpieza basica de los items — no confiamos en el cliente.
     * Maximo 50 items para evitar payloads abusivos. */
    if (items.length > 50) {
      return res.status(400).json({ error: 'Demasiados articulos' });
    }
    const cleanItems = items.slice(0, 50).map((i) => ({
      productId: i.productId ? String(i.productId).slice(0, 60) : undefined,
      slug:      i.slug ? String(i.slug).slice(0, 200) : undefined,
      name:      String(i.name || '').slice(0, 200),
      brand:     String(i.brand || '').slice(0, 80),
      price:     Math.max(0, Number(i.price) || 0),
      qty:       Math.max(1, Math.round(Number(i.qty) || 1)),
      image:     String(i.image || '').slice(0, 500),
      selectedVariants: (() => {
        const v = i.selectedVariants;
        if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
        const entries = Object.entries(v)
          .filter(([k, val]) => typeof k === 'string' && typeof val === 'string' && k && val)
          .slice(0, 6)
          .map(([k, val]) => [String(k).slice(0, 60), String(val).slice(0, 60)]);
        return entries.length ? Object.fromEntries(entries) : undefined;
      })(),
    }));
    const subtotal = cleanItems.reduce((s, i) => s + i.price * i.qty, 0);

    await Cart.findOneAndUpdate(
      { email: normalizedEmail, convertedToOrder: false },
      {
        $set: {
          items: cleanItems,
          subtotal,
          customerName: name ? String(name).slice(0, 80) : '',
          userId: userId || null,
          /* Si el cliente sigue activo despues de recibir el recovery, no
           * resetamos sentAt — un solo email por carrito de por vida. */
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
