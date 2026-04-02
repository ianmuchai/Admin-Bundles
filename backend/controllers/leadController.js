const pool = require('../config/db');

// GET /api/leads?search=…&status=new
exports.listLeads = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
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
        `(name ILIKE $${idx} OR COALESCE(email,'') ILIKE $${idx} OR COALESCE(phone,'') ILIKE $${idx} OR COALESCE(address,'') ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM leads ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ total, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/leads
exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const { rows } = await pool.query(
      `INSERT INTO leads (name, email, phone, address, notes, status)
       VALUES ($1,$2,$3,$4,$5,'new') RETURNING *`,
      [name, email || null, phone || null, address || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/leads/:id
exports.updateLead = async (req, res) => {
  try {
    const { name, email, phone, address, notes, status } = req.body;
    const allowedStatuses = ['new', 'contacted', 'qualified', 'lost'];
    const { rows } = await pool.query(
      `UPDATE leads SET
         name       = COALESCE($1, name),
         email      = COALESCE($2, email),
         phone      = COALESCE($3, phone),
         address    = COALESCE($4, address),
         notes      = COALESCE($5, notes),
         status     = CASE WHEN $6 = ANY($7::text[]) THEN $6 ELSE status END,
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, email, phone, address, notes, status, allowedStatuses, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/leads/:id
exports.deleteLead = async (req, res) => {
  try {
    await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
