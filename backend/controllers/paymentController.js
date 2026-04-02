const pool = require('../config/db');

// GET /api/payments?status=checked&search=…
exports.listPayments = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [];
    let params = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(
        `(user_name ILIKE $${idx} OR phone ILIKE $${idx} OR receipt ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM payments ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT * FROM payments ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ total, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/payments
exports.recordPayment = async (req, res) => {
  try {
    const { client_id, user_name, phone, receipt, amount, notes } = req.body;
    if (!user_name || !receipt || !amount)
      return res.status(400).json({ message: 'user_name, receipt and amount are required' });
    if (parseFloat(amount) <= 0)
      return res.status(400).json({ message: 'Amount must be positive' });

    // Detect duplicate receipt
    const dup = await pool.query('SELECT id FROM payments WHERE receipt = $1', [receipt]);
    if (dup.rows.length > 0)
      return res.status(409).json({ message: 'Receipt number already recorded' });

    const { rows } = await pool.query(
      `INSERT INTO payments (client_id, user_name, phone, receipt, amount, status, notes)
       VALUES ($1,$2,$3,$4,$5,'unchecked',$6)
       RETURNING *`,
      [client_id || null, user_name, phone || null, receipt, parseFloat(amount), notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/payments/:id/status  { status: "checked" | "unchecked" }
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['checked', 'unchecked'].includes(status))
      return res.status(400).json({ message: 'status must be checked or unchecked' });

    const { rows } = await pool.query(
      'UPDATE payments SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Payment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/payments/:id
exports.deletePayment = async (req, res) => {
  try {
    await pool.query('DELETE FROM payments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/payments/earnings  — summary cards
exports.getEarnings = async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now - 7 * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(now - 30 * 86400000).toISOString().split('T')[0];
    const hourAgo = new Date(now - 3600000);

    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= $1 THEN amount END), 0) AS hourly,
        COALESCE(SUM(CASE WHEN payment_date = $2 THEN amount END), 0) AS daily,
        COALESCE(SUM(CASE WHEN payment_date >= $3 THEN amount END), 0) AS weekly,
        COALESCE(SUM(CASE WHEN payment_date >= $4 THEN amount END), 0) AS monthly
      FROM payments
      WHERE status = 'checked'`;

    const { rows } = await pool.query(query, [hourAgo, todayStr, weekAgo, monthAgo]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
