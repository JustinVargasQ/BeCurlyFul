const { Schema, model } = require('mongoose');

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name:      String,
    brand:     String,
    price:     Number,
    qty:       Number,
    image:     String,
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, unique: true },   // JD-2024-0001
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customer: {
      name:     { type: String, required: true },
      phone:    { type: String, required: true },
      email:    { type: String, default: '' },
      province: { type: String, required: true },
      address:  { type: String, required: true },
      notes:    { type: String, default: '' },
      lat:      { type: Number, default: null },
      lng:      { type: Number, default: null },
    },
    items:         [orderItemSchema],
    subtotal:      { type: Number, required: true },
    discount:      { type: Number, default: 0 },
    coupon: {
      code:        { type: String, default: null },
      discount:    { type: Number, default: 0 },
      freeShipping:{ type: Boolean, default: false },
    },
    shippingCost:  { type: Number, default: 0 },
    total:         { type: Number, required: true },
    // 'retiro' (no 'pickup') porque asi lo usa el frontend y el controller.
    // Aceptamos 'pickup' como alias historico para no romper ordenes viejas.
    shippingMethod:{ type: String, enum: ['correos', 'express', 'retiro', 'pickup'], default: 'correos' },
    status: {
      type: String,
      enum: ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'],
      default: 'pendiente',
    },
    whatsappSent:   { type: Boolean, default: false },
    internalNotes:  { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate order number before save
orderSchema.pre('save', async function () {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    const year  = new Date().getFullYear();
    this.orderNumber = `JD-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });

module.exports = model('Order', orderSchema);
