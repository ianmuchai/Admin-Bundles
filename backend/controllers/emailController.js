const pool = require('../config/db');

// GET /api/emails?search=…
exports.listEmails = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    let params = [];
    if (search) {
      where = `WHERE (recipient ILIKE $1 OR subject ILIKE $1)`;
      params.push(`%${search}%`);
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM emails ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    const idx = params.length + 1;

    const { rows } = await pool.query(
      `SELECT * FROM emails ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ total, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/emails/send  { client_id?, recipient, subject, body }
exports.sendEmail = async (req, res) => {
  try {
    const { client_id, recipient, subject, body } = req.body;
    if (!recipient || !subject || !body)
      return res.status(400).json({ message: 'recipient, subject and body are required' });

    // TODO: Integrate with Nodemailer / SendGrid
    const { rows } = await pool.query(
      `INSERT INTO emails (client_id, recipient, subject, body, status)
       VALUES ($1,$2,$3,$4,'sent') RETURNING *`,
      [client_id || null, recipient, subject, body]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
