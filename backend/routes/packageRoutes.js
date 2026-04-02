const express = require('express');
const router = express.Router();
const {
  listPackages, getPackage, createPackage,
  updatePackage, deletePackage, getPackageCounts
} = require('../controllers/packageController');
const { protect } = require('../middleware/adminAuth');

router.get('/counts', protect, getPackageCounts);
router.get('/', protect, listPackages);
router.get('/:id', protect, getPackage);
router.post('/', protect, createPackage);
router.put('/:id', protect, updatePackage);
router.delete('/:id', protect, deletePackage);

module.exports = router;
