const express = require('express');
const router = express.Router();
const { listEmails, sendEmail } = require('../controllers/emailController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listEmails);
router.post('/send', protect, sendEmail);

module.exports = router;
