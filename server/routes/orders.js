const router      = require('express').Router();
const ctrl        = require('../controllers/orderController');
const requireAuth = require('../middleware/auth');
const { optionalUser } = require('../middleware/userAuth');

/* Public — checkout works for guests AND logged-in users */
router.post('/',                    optionalUser, ctrl.create);
router.get('/track/:number',        ctrl.getByNumber);

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
router.patch('/admin/:id/status',   requireAuth, ctrl.updateStatus);
router.patch('/admin/:id/notes',    requireAuth, ctrl.updateNotes);

module.exports = router;
