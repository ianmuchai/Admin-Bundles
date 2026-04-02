const express = require('express');
const router = express.Router();
const { listLeads, createLead, updateLead, deleteLead } = require('../controllers/leadController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listLeads);
router.post('/', protect, createLead);
router.put('/:id', protect, updateLead);
router.delete('/:id', protect, deleteLead);

module.exports = router;
