const express = require('express');
const router = express.Router();
const {
  listTickets, getTicket, createTicket,
  updateTicketStatus, deleteTicket, getTicketCounts
} = require('../controllers/ticketController');
const { protect } = require('../middleware/adminAuth');

router.get('/counts', protect, getTicketCounts);
router.get('/', protect, listTickets);
router.get('/:id', protect, getTicket);
router.post('/', protect, createTicket);
router.patch('/:id/status', protect, updateTicketStatus);
router.delete('/:id', protect, deleteTicket);

module.exports = router;
