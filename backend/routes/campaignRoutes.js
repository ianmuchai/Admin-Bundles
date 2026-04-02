const express = require('express');
const router = express.Router();
const {
  listCampaigns, createCampaign, sendCampaign, deleteCampaign
} = require('../controllers/campaignController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listCampaigns);
router.post('/', protect, createCampaign);
router.post('/:id/send', protect, sendCampaign);
router.delete('/:id', protect, deleteCampaign);

module.exports = router;
