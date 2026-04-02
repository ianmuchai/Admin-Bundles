const pool = require('../config/db');

// GET /api/clients?tab=PPPoE&status=Active&search=…&page=1&limit=50
exports.listClients = async (req, res) => {
  try {
    const { tab, status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (tab && tab !== 'All') {
      conditions.push(`c.connection_type = $${idx++}`);
      params.push(tab);
    }
    if (status && status !== 'All Statuses') {
      conditions.push(`c.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(
        `(c.username ILIKE $${idx} OR c.first_name ILIKE $${idx} OR c.last_name ILIKE $${idx} OR c.phone ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM clients c ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT c.*,
              p.name AS package_name,
              p.download_speed,
              p.upload_speed
       FROM clients c
       LEFT JOIN packages p ON c.package_id = p.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ total, page: parseInt(page), limit: parseInt(limit), data: rows });
  } catch (err) {
    console.error('listClients error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/clients/:id
exports.getClient = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.name AS package_name FROM clients c
       LEFT JOIN packages p ON c.package_id = p.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Client not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/clients
exports.createClient = async (req, res) => {
  try {
    const {
      username, first_name, last_name, phone, email,
      house_no, apartment, location, connection_type,
      package_id, installation_fee,
    } = req.body;

    if (!username || !first_name || !last_name || !phone)
      return res.status(400).json({ message: 'username, first_name, last_name and phone are required' });

    // Check uniqueness
    const dup = await pool.query('SELECT id FROM clients WHERE username = $1', [username]);
    if (dup.rows.length > 0)
      return res.status(409).json({ message: 'Username already exists' });

    // Default expiry: 30 days from today
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const { rows } = await pool.query(
      `INSERT INTO clients
         (username, first_name, last_name, phone, email, house_no, apartment, location,
          connection_type, package_id, installation_fee, status, online, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Active',true,$12)
       RETURNING *`,
      [
        username, first_name, last_name, phone, email || null,
        house_no || null, apartment || null, location || null,
        connection_type || 'PPPoE', package_id || null,
        installation_fee || false,
        expiry.toISOString().split('T')[0],
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createClient error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/clients/:id
exports.updateClient = async (req, res) => {
  try {
    const {
      first_name, last_name, phone, email,
      house_no, apartment, location, connection_type,
      package_id, status, online, expiry_date,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE clients SET
         first_name = COALESCE($1, first_name),
         last_name  = COALESCE($2, last_name),
         phone      = COALESCE($3, phone),
         email      = COALESCE($4, email),
         house_no   = COALESCE($5, house_no),
         apartment  = COALESCE($6, apartment),
         location   = COALESCE($7, location),
         connection_type = COALESCE($8, connection_type),
         package_id = COALESCE($9, package_id),
         status     = COALESCE($10, status),
         online     = COALESCE($11, online),
         expiry_date = COALESCE($12::date, expiry_date),
         updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        first_name, last_name, phone, email,
        house_no, apartment, location, connection_type,
        package_id, status, online, expiry_date,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Client not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/clients/:id
exports.deleteClient = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/clients/counts  — tab counts
exports.getTabCounts = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT connection_type, COUNT(*) AS count FROM clients GROUP BY connection_type`
    );
    const counts = { PPPoE: 0, Static: 0, DHCP: 0, Hotspot: 0 };
    rows.forEach(r => { counts[r.connection_type] = parseInt(r.count); });
    counts.All = Object.values(counts).reduce((a, b) => a + b, 0);
    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
