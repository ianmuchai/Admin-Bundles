const express = require('express');
const router = express.Router();
const {
  listVouchers, generateVouchers, getVoucher, deleteVoucher
} = require('../controllers/voucherController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listVouchers);
router.post('/generate', protect, generateVouchers);
router.get('/:id', protect, getVoucher);
router.delete('/:id', protect, deleteVoucher);

module.exports = router;
