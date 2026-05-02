const jwt = require('jsonwebtoken');

/* Required user auth — fails with 401 if no valid user token */
function requireUser(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesión requerida' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.type !== 'user') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

/* Optional user auth — never fails, sets req.user if valid token present */
function optionalUser(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (payload.type === 'user') {
        req.user = { id: payload.id, email: payload.email };
      }
    } catch { /* ignore — guest checkout */ }
  }
  next();
}

module.exports = { requireUser, optionalUser };
