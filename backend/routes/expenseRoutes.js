const express = require('express');
const router = express.Router();
const {
  listExpenses, createExpense, updateExpense, deleteExpense, getCategories
} = require('../controllers/expenseController');
const { protect } = require('../middleware/adminAuth');

router.get('/categories', protect, getCategories);
router.get('/', protect, listExpenses);
router.post('/', protect, createExpense);
router.put('/:id', protect, updateExpense);
router.delete('/:id', protect, deleteExpense);

module.exports = router;
