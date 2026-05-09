const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { chat, chatStream, adminInsights } = require('../controllers/chatbotController');

router.post('/', chat);
router.post('/stream', chatStream);
router.get('/admin/insights', requireAuth, adminInsights);

module.exports = router;
