const express = require('express');
const router = express.Router();
const {
  listSites, getSite, createSite, updateSite, deleteSite
} = require('../controllers/siteController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listSites);
router.get('/:id', protect, getSite);
router.post('/', protect, createSite);
router.put('/:id', protect, updateSite);
router.delete('/:id', protect, deleteSite);

module.exports = router;
