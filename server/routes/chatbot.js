const express = require('express');
const router = express.Router();
const { chat, chatStream } = require('../controllers/chatbotController');

router.post('/', chat);
router.post('/stream', chatStream);

module.exports = router;
