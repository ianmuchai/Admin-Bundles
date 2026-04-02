const express = require('express');
const router = express.Router();
const {
  listActiveSessions, startSession, endSession
} = require('../controllers/activeSessionController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listActiveSessions);
router.post('/', protect, startSession);
router.patch('/:id/end', protect, endSession);

module.exports = router;
