const express = require('express');
const router = express.Router();
const {
  listPayments, recordPayment, updatePaymentStatus,
  deletePayment, getEarnings
} = require('../controllers/paymentController');
const { protect } = require('../middleware/adminAuth');

router.get('/earnings', protect, getEarnings);
router.get('/', protect, listPayments);
router.post('/', protect, recordPayment);
router.patch('/:id/status', protect, updatePaymentStatus);
router.delete('/:id', protect, deletePayment);

module.exports = router;
