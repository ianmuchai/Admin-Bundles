const express = require('express');
const router = express.Router();
const { listAdminUsers, createAdminUser, deleteAdminUser } = require('../controllers/adminUserController');
const { protect } = require('../middleware/adminAuth');

router.get('/', protect, listAdminUsers);
router.post('/', protect, createAdminUser);
router.delete('/:id', protect, deleteAdminUser);

module.exports = router;
