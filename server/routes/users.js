const router = require('express').Router();
const ctrl   = require('../controllers/userAuthController');
const { requireUser } = require('../middleware/userAuth');

router.post('/auth/google', ctrl.googleLogin);
router.get('/me',           requireUser, ctrl.me);
router.get('/me/orders',    requireUser, ctrl.myOrders);

module.exports = router;
