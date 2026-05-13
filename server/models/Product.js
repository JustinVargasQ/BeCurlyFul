const { Schema, model } = require('mongoose');

const productSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    brand:       { type: String, required: true, trim: true },
    category:    { type: String, required: true, enum: ['ojos', 'labios', 'rostro', 'skincare', 'maquillaje', 'cabello'] },
    price:       { type: Number, required: true, min: 0 },
    oldPrice:    { type: Number, default: null },
    description: { type: String, default: '' },
    features:    [{ type: String }],
    // Tags libres para destrabar miscategorización del chatbot. Ej:
    //   ['serum','antiage'] en una crema con retinol que se llama distinto;
    //   ['accesorio'] en algodones/vinchas para que NO aparezcan en browses generales;
    //   ['kit'] en sets/combos. Lowercase, sin acentos. Recomendado max 6 por producto.
    tags:        [{ type: String, lowercase: true, trim: true }],
    images:      [{ type: String }],          // URLs (Cloudinary o /uploads/...)
    stock:       { type: Number, default: null, min: 0 },
    isActive:    { type: Boolean, default: true },
    badge:       { type: String, default: '' },
    badgeType:   { type: String, default: '' },
    rating:      { type: Number, default: 5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    variants: [{
      name:    { type: String, required: true },
      // options ahora puede ser:
      //   - String (formato legacy: 'Rojo'), o
      //   - Object: { value: 'Rojo', image: 'https://...' }
      // Soportamos ambos para no romper productos viejos. El controller
      // normaliza al leer.
      options: [{ type: Schema.Types.Mixed }],
    }],
    restockRequests: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // Exponer `id` virtual al serializar — el cliente usa ese campo (no `_id`)
    // para matchear items en el carrito y wishlist.
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ tags: 1, isActive: 1 });

module.exports = model('Product', productSchema);
