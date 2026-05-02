const ProductReview = require('../models/ProductReview');
const Product       = require('../models/Product');
const User          = require('../models/User');

async function syncRating(productId) {
  const reviews = await ProductReview.find({ product: productId, approved: true });
  if (!reviews.length) return;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  await Product.findByIdAndUpdate(productId, {
    rating:      Math.round(avg * 10) / 10,
    reviewCount: reviews.length,
  });
}

exports.getByProduct = async (req, res, next) => {
  try {
    const reviews = await ProductReview
      .find({ product: req.params.productId, approved: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-__v');
    res.json(reviews);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    /* Require user login */
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Iniciá sesión para dejar una reseña' });
    }
    const { productId, rating, comment } = req.body;
    if (!productId || !rating) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    /* Prevent duplicate review per product/user (caught by index too, but cleaner error) */
    const existing = await ProductReview.findOne({ product: productId, userId: user._id });
    if (existing) {
      return res.status(409).json({ error: 'Ya dejaste una reseña para este producto' });
    }

    await ProductReview.create({
      product:      productId,
      userId:       user._id,
      authorName:   user.name,
      authorAvatar: user.picture || '',
      rating:       Math.min(5, Math.max(1, Number(rating))),
      comment:      (comment || '').trim(),
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Ya dejaste una reseña para este producto' });
    }
    next(err);
  }
};

exports.adminGetAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.approved !== undefined) filter.approved = req.query.approved === 'true';
    const reviews = await ProductReview.find(filter)
      .populate('product', 'name slug')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(reviews);
  } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const review = await ProductReview.findByIdAndUpdate(
      req.params.id, { approved: true }, { new: true }
    );
    if (!review) return res.status(404).json({ error: 'Reseña no encontrada' });
    await syncRating(review.product);
    res.json(review);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const review = await ProductReview.findByIdAndDelete(req.params.id);
    if (review) await syncRating(review.product);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
