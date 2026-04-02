const pool = require('../config/db');

// GET /api/packages?type=PPPOE&search=…
exports.listPackages = async (req, res) => {
  try {
    const { type, search } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (type && type !== 'All') {
      conditions.push(`type = $${idx++}`);
      params.push(type);
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR type ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT * FROM packages ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/packages/:id
exports.getPackage = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM packages WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Package not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/packages
exports.createPackage = async (req, res) => {
  try {
    const { name, type, upload_speed, download_speed, burst, period, unit, price } = req.body;
    if (!name || !upload_speed || !download_speed || !period || !price)
      return res.status(400).json({ message: 'name, upload_speed, download_speed, period, price are required' });

    const { rows } = await pool.query(
      `INSERT INTO packages (name, type, upload_speed, download_speed, burst, period, unit, price, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
       RETURNING *`,
      [name, type || 'PPPOE', upload_speed, download_speed, burst || false, period, unit || 'Month(s)', price]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/packages/:id
exports.updatePackage = async (req, res) => {
  try {
    const { name, type, upload_speed, download_speed, burst, period, unit, price, enabled } = req.body;
    const { rows } = await pool.query(
      `UPDATE packages SET
         name           = COALESCE($1, name),
         type           = COALESCE($2, type),
         upload_speed   = COALESCE($3, upload_speed),
         download_speed = COALESCE($4, download_speed),
         burst          = COALESCE($5, burst),
         period         = COALESCE($6, period),
         unit           = COALESCE($7, unit),
         price          = COALESCE($8, price),
         enabled        = COALESCE($9, enabled),
         updated_at     = NOW()
       WHERE id = $10
       RETURNING *`,
      [name, type, upload_speed, download_speed, burst, period, unit, price, enabled, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Package not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/packages/:id
exports.deletePackage = async (req, res) => {
  try {
    await pool.query('DELETE FROM packages WHERE id = $1', [req.params.id]);
    res.json({ message: 'Package deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/packages/counts
exports.getPackageCounts = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT type, COUNT(*) AS count FROM packages GROUP BY type');
    const counts = { All: 0, PPPOE: 0, Hotspot: 0, 'Data Plans': 0, 'Free Trial': 0 };
    rows.forEach(r => { counts[r.type] = parseInt(r.count); });
    counts.All = rows.reduce((s, r) => s + parseInt(r.count), 0);
    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
