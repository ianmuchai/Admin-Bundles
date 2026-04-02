const express = require('express');
const router = express.Router();
const {
  getStats, getTotalUsers, getActiveUsers,
  getMonthlyRevenue, getChartData
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/adminAuth');

router.get('/stats', protect, getStats);
router.get('/total-users', protect, getTotalUsers);
router.get('/active-users', protect, getActiveUsers);
router.get('/monthly-revenue', protect, getMonthlyRevenue);
router.get('/charts', protect, getChartData);

module.exports = router;
