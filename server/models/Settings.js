const { Schema, model } = require('mongoose');

const settingsSchema = new Schema(
  {
    key:       { type: String, default: 'main', unique: true },

    storeName: { type: String, default: 'JD Virtual' },
    whatsapp:  { type: String, default: '50688045100' },
    email:     { type: String, default: '' },
    address:   { type: String, default: '' },

    heroTitle: { type: String, default: 'Belleza auténtica' },
    heroSub:   { type: String, default: 'Maquillaje y skincare de marcas originales.' },
    heroStyle: { type: String, enum: ['grid', 'video'], default: 'grid' },

    shippingCostCorreos: { type: Number, default: 2500, min: 0 },
    shippingCostExpress: { type: Number, default: 4500, min: 0 },
    freeShippingFrom:    { type: Number, default: 25000, min: 0 },

    bankInfo: { type: String, default: '' },

    /* SINPE Movil — datos del titular para que el cliente pueda transferir.
     * Editables desde /admin/config para que el dueno cambie sin redeploy. */
    sinpePhone: { type: String, default: '' },
    sinpeName:  { type: String, default: '' },

    promoBanner:       { type: String, default: '' },
    promoBannerActive: { type: Boolean, default: false },
    promoBannerColor:  { type: String, default: '#B85F72' },

    notificationEmail: { type: String, default: '' },

    autoConfirmOrders: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('Settings', settingsSchema);
