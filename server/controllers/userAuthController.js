const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User  = require('../models/User');
const Order = require('../models/Order');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const signUserToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), email: user.email, type: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_USER_EXPIRES || '30d' }
  );

/**
 * POST /api/users/auth/google
 * Body: { credential: <google ID token> }
 * Verifies token with Google, finds/creates user, links any guest orders by email,
 * and returns { token, user }.
 */
exports.googleLogin = async (req, res, next) => {
  try {
    if (!client) {
      return res.status(500).json({ error: 'Google login no configurado en el servidor' });
    }

    const { credential } = req.body;
    if (!credential || typeof credential !== 'string' || credential.length > 4096) {
      return res.status(400).json({ error: 'Credencial inválida' });
    }

    /* Verify the ID token with Google */
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch {
      return res.status(401).json({ error: 'Token de Google inválido' });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ error: 'Email no verificado por Google' });
    }

    const { sub: googleId, email, name, picture, locale } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    /* Find existing user by googleId, or by email (rare edge case) */
    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });

    if (!user) {
      /* New user — create + link any prior guest orders by email */
      user = await User.create({
        googleId,
        email: normalizedEmail,
        name: name || normalizedEmail,
        picture: picture || '',
        locale: locale || '',
      });

      /* Link guest orders that match this email */
      try {
        await Order.updateMany(
          { 'customer.email': normalizedEmail, $or: [{ userId: { $exists: false } }, { userId: null }] },
          { $set: { userId: user._id } }
        );
      } catch { /* non-fatal */ }
    } else {
      /* Existing user — refresh data if changed */
      let dirty = false;
      if (!user.googleId) { user.googleId = googleId; dirty = true; }
      if (name && user.name !== name) { user.name = name; dirty = true; }
      if (picture && user.picture !== picture) { user.picture = picture; dirty = true; }
      if (dirty) await user.save();
    }

    res.json({
      token: signUserToken(user),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: user.createdAt,
    });
  } catch (err) { next(err); }
};

exports.myOrders = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    /* Match by userId OR by email (covers historical guest orders) */
    const orders = await Order.find({
      $or: [{ userId: user._id }, { 'customer.email': user.email }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-__v -internalNotes');

    res.json({ orders });
  } catch (err) { next(err); }
};
