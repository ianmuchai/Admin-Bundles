const pool = require('../config/db');

// GET /api/expenses?search=…&category=…
exports.listExpenses = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [];
    let params = [];
    let idx = 1;

    if (category) {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`(title ILIKE $${idx} OR COALESCE(category,'') ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM expenses ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT * FROM expenses ${where} ORDER BY expense_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    // total amount
    const sumRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total_amount FROM expenses ${where}`,
      params
    );

    res.json({ total, total_amount: parseFloat(sumRes.rows[0].total_amount), data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/expenses
exports.createExpense = async (req, res) => {
  try {
    const { title, category, amount, notes, expense_date } = req.body;
    if (!title || !amount)
      return res.status(400).json({ message: 'title and amount are required' });
    if (parseFloat(amount) <= 0)
      return res.status(400).json({ message: 'amount must be positive' });

    const { rows } = await pool.query(
      `INSERT INTO expenses (title, category, amount, notes, expense_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, category || null, parseFloat(amount), notes || null,
       expense_date || new Date().toISOString().split('T')[0]]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const { title, category, amount, notes, expense_date } = req.body;
    const { rows } = await pool.query(
      `UPDATE expenses SET
         title        = COALESCE($1, title),
         category     = COALESCE($2, category),
         amount       = COALESCE($3, amount),
         notes        = COALESCE($4, notes),
         expense_date = COALESCE($5::date, expense_date)
       WHERE id = $6 RETURNING *`,
      [title, category, amount, notes, expense_date, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Expense not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/expenses/categories
exports.getCategories = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL ORDER BY category'
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
