const express = require('express');
const router = express.Router();
const { listMessages, sendMessage, sendBulkMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listMessages);
router.post('/send', protect, sendMessage);
router.post('/bulk', protect, sendBulkMessages);

module.exports = router;
