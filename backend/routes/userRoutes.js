const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
module.exports = router;

const { getBundles } = require('../controllers/bundleController');
// ...existing code...
router.get('/bundles', getBundles);
// ...existing code...