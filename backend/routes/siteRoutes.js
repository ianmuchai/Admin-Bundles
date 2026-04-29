const express = require('express');
const router = express.Router();
const {
  listSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  testSiteConnection,
} = require('../controllers/siteController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listSites);
router.get('/:id', protect, getSite);
router.post('/', protect, createSite);
router.put('/:id', protect, updateSite);
router.post('/:id/test-connection', protect, testSiteConnection);
router.delete('/:id', protect, deleteSite);

module.exports = router;
