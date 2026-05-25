const { Schema, model } = require('mongoose');

/* Mismo shape que orderItem pero sin productId required — un cart abandonado
 * puede tener items de productos que cambiaron de slug/_id. Para el email
 * solo necesitamos nombre/imagen/precio que es lo que el cliente verá. */
const cartItemSchema = new Schema(
  {
    productId: String,
    slug:      String,
    name:      String,
    brand:     String,
    price:     Number,
    qty:       Number,
    image:     String,
    selectedVariants: { type: Map, of: String, default: undefined },
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    /* Identidad — uno de los dos, pero email es obligatorio para poder
     * enviar la recuperacion. Indexado para upsert rapido en cada save. */
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    customerName: { type: String, default: '' },

    items:    [cartItemSchema],
    subtotal: { type: Number, default: 0 },

    /* Tracking del email de recuperacion — null = no enviado todavia.
     * Una vez seteado, no se vuelve a enviar (no spam). */
    recoveryEmailSentAt: { type: Date, default: null, index: true },

    /* Cuando el cliente convierte a Order, marcamos esto para no enviar
     * el email aunque el cart siga en la DB. */
    convertedToOrder: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

/* TTL: borrar carts despues de 14 dias. Una vez que pasaron 14d sin compra,
 * el contexto se enfrio y el email ya no tiene sentido. Tambien ayuda a no
 * acumular basura en la DB. */
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

/* Compound index para la query del cron job:
 * "carritos no convertidos, no notificados, viejos de 1h+" */
cartSchema.index({ convertedToOrder: 1, recoveryEmailSentAt: 1, updatedAt: 1 });

module.exports = model('Cart', cartSchema);
