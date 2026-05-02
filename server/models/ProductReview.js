const { Schema, model } = require('mongoose');

const productReviewSchema = new Schema({
  product:      { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  userId:       { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  authorName:   { type: String, required: true, trim: true, maxlength: 80 },
  authorAvatar: { type: String, default: '' },
  rating:       { type: Number, required: true, min: 1, max: 5 },
  comment:      { type: String, default: '', maxlength: 1000 },
  approved:     { type: Boolean, default: false },
}, { timestamps: true });

productReviewSchema.index({ product: 1, approved: 1, createdAt: -1 });
/* Prevent duplicate reviews per user per product */
productReviewSchema.index(
  { product: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);
module.exports = model('ProductReview', productReviewSchema);
