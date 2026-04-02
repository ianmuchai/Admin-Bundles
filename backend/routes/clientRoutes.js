const express = require('express');
const router = express.Router();
const {
  listClients, getClient, createClient,
  updateClient, deleteClient, getTabCounts
} = require('../controllers/clientController');
const { protect } = require('../middleware/adminAuth');

router.get('/counts', protect, getTabCounts);
router.get('/', protect, listClients);
router.get('/:id', protect, getClient);
router.post('/', protect, createClient);
router.put('/:id', protect, updateClient);
router.delete('/:id', protect, deleteClient);

module.exports = router;
