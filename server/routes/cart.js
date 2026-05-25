const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('../controllers/cartController');

/* Anti-spam: el endpoint es publico (lo llama cualquier visitante del
 * checkout). 30 saves/min/IP cubre a un cliente real que tipea el email,
 * agrega/quita items, etc., pero corta a un bot que intente inflar la DB. */
const saveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas actualizaciones. Esperá un momento.' },
});

router.post('/save', saveLimiter, ctrl.save);

module.exports = router;
