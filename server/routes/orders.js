const router      = require('express').Router();
const rateLimit   = require('express-rate-limit');
const ctrl        = require('../controllers/orderController');
const requireAuth = require('../middleware/auth');
const { optionalUser } = require('../middleware/userAuth');

/* Anti-spam: max 6 ordenes / hora / IP. Un cliente legitimo no necesita mas;
 * un bot que ataque el endpoint queda capado rapido. standardHeaders='draft-7'
 * para que Brevo/Render no se confundan con headers viejos. */
const createOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos en poco tiempo. Intentá de nuevo en unos minutos.' },
});

/* Tracking publico — separar el limit del de creacion. Es solo lectura,
 * permitimos mas (30/min) por si alguien refresca su pedido. */
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/* Public — checkout works for guests AND logged-in users */
router.post('/',                    createOrderLimiter, optionalUser, ctrl.create);
router.get('/track/:number',        trackLimiter, ctrl.getByNumber);

/* Admin */
router.get('/admin/all',            requireAuth, ctrl.adminGetAll);
router.post('/admin/backfill-images', requireAuth, ctrl.backfillItemImages);
router.post('/admin/backfill-emails', requireAuth, ctrl.backfillCustomerEmails);
router.get('/admin/smtp-status',    requireAuth, ctrl.smtpDiagnostic);
router.get('/admin/stats',          requireAuth, ctrl.stats);
router.get('/admin/chart',          requireAuth, ctrl.chart);
router.get('/admin/top-products',   requireAuth, ctrl.topProducts);
router.get('/admin/:id',            requireAuth, ctrl.adminGetOne);
router.patch('/admin/bulk-status',  requireAuth, ctrl.bulkUpdateStatus);
router.patch('/admin/:id/status',           requireAuth, ctrl.updateStatus);
router.patch('/admin/:id/payment-status',   requireAuth, ctrl.updatePaymentStatus);
router.patch('/admin/:id/notes',            requireAuth, ctrl.updateNotes);

module.exports = router;
