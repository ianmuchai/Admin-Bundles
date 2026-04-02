const pool = require('../config/db');

// GET /api/sites?tab=all&search=…
exports.listSites = async (req, res) => {
  try {
    const { tab, search } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (tab === 'operational') {
      conditions.push(`status = 'Online'`);
    }
    if (search) {
      conditions.push(`(board_name ILIKE $${idx} OR COALESCE(remote_winbox,'') ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT id, board_name, provisioning, cpu_percent, memory_mb, status, remote_winbox, ip_address, created_at
       FROM sites ${where} ORDER BY created_at DESC`,
      params
    );

    const total = rows.length;
    const active = rows.filter(s => s.status === 'Online').length;
    const offline = total - active;

    res.json({ total, active, offline, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/sites/:id
exports.getSite = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, board_name, provisioning, cpu_percent, memory_mb, status, remote_winbox, ip_address, created_at, updated_at FROM sites WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Site not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/sites
exports.createSite = async (req, res) => {
  try {
    const { board_name, ip_address, remote_winbox, mikrotik_user, mikrotik_pass } = req.body;
    if (!board_name) return res.status(400).json({ message: 'board_name is required' });

    const dup = await pool.query('SELECT id FROM sites WHERE board_name = $1', [board_name]);
    if (dup.rows.length > 0)
      return res.status(409).json({ message: 'Board name already exists' });

    const { rows } = await pool.query(
      `INSERT INTO sites (board_name, ip_address, remote_winbox, mikrotik_user, mikrotik_pass, provisioning, status)
       VALUES ($1,$2,$3,$4,$5,'Pending','Offline')
       RETURNING id, board_name, provisioning, cpu_percent, memory_mb, status, remote_winbox, ip_address, created_at`,
      [board_name, ip_address || null, remote_winbox || null, mikrotik_user || null, mikrotik_pass || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/sites/:id
exports.updateSite = async (req, res) => {
  try {
    const { board_name, ip_address, remote_winbox, provisioning, status, cpu_percent, memory_mb } = req.body;
    const { rows } = await pool.query(
      `UPDATE sites SET
         board_name    = COALESCE($1, board_name),
         ip_address    = COALESCE($2, ip_address),
         remote_winbox = COALESCE($3, remote_winbox),
         provisioning  = COALESCE($4, provisioning),
         status        = COALESCE($5, status),
         cpu_percent   = COALESCE($6, cpu_percent),
         memory_mb     = COALESCE($7, memory_mb),
         updated_at    = NOW()
       WHERE id = $8
       RETURNING id, board_name, provisioning, cpu_percent, memory_mb, status, remote_winbox, ip_address`,
      [board_name, ip_address, remote_winbox, provisioning, status, cpu_percent, memory_mb, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Site not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/sites/:id
exports.deleteSite = async (req, res) => {
  try {
    await pool.query('DELETE FROM sites WHERE id = $1', [req.params.id]);
    res.json({ message: 'Site deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
