const pool = require('../config/db');

function generateCode() {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VOUCHER-${ts}-${rand}`;
}

// GET /api/vouchers?search=…&page=1&limit=50
exports.listVouchers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let params = [];
    let where = '';
    if (search) {
      where = `WHERE (v.code ILIKE $1 OR COALESCE(v.package_name,'') ILIKE $1)`;
      params.push(`%${search}%`);
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM vouchers v ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const idx = params.length + 1;
    const { rows } = await pool.query(
      `SELECT v.*, p.name AS pkg_name
       FROM vouchers v
       LEFT JOIN packages p ON v.package_id = p.id
       ${where}
       ORDER BY v.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ total, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/vouchers/generate  { package_id, package_name, quantity }
exports.generateVouchers = async (req, res) => {
  try {
    const { package_id, package_name, quantity } = req.body;
    const qty = parseInt(quantity);
    if (!qty || qty < 1 || qty > 500)
      return res.status(400).json({ message: 'quantity must be between 1 and 500' });

    const created = [];
    for (let i = 0; i < qty; i++) {
      let code;
      let unique = false;
      // Retry until unique (extremely rare collision)
      while (!unique) {
        code = generateCode();
        const check = await pool.query('SELECT id FROM vouchers WHERE code = $1', [code]);
        if (check.rows.length === 0) unique = true;
      }
      const { rows } = await pool.query(
        `INSERT INTO vouchers (code, package_id, package_name, max_uses, used_count)
         VALUES ($1,$2,$3,1,0) RETURNING *`,
        [code, package_id || null, package_name || null]
      );
      created.push(rows[0]);
    }
    res.status(201).json({ generated: created.length, vouchers: created });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/vouchers/:id
exports.getVoucher = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vouchers WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Voucher not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/vouchers/:id
exports.deleteVoucher = async (req, res) => {
  try {
    await pool.query('DELETE FROM vouchers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Voucher deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
