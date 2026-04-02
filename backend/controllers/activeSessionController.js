const pool = require('../config/db');

// GET /api/active-sessions?type=all|hotspot|pppoe|expiry&search=…
exports.listActiveSessions = async (req, res) => {
  try {
    const { type, search } = req.query;
    let conditions = [`session_end IS NULL`];
    let params = [];
    let idx = 1;

    if (type && type !== 'all') {
      conditions.push(`session_type = $${idx++}`);
      params.push(type);
    }
    if (search) {
      conditions.push(
        `(username ILIKE $${idx} OR COALESCE(ip_address,'') ILIKE $${idx} OR COALESCE(mac_address,'') ILIKE $${idx} OR COALESCE(router,'') ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT * FROM active_sessions ${where} ORDER BY session_start DESC`,
      params
    );

    const counts = { all: 0, hotspot: 0, pppoe: 0, expiry: 0 };
    const allRes = await pool.query(
      `SELECT session_type, COUNT(*) AS cnt FROM active_sessions WHERE session_end IS NULL GROUP BY session_type`
    );
    allRes.rows.forEach(r => {
      counts[r.session_type] = parseInt(r.cnt);
      counts.all += parseInt(r.cnt);
    });

    res.json({ counts, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/active-sessions  — register a new session (from MikroTik hook or manual)
exports.startSession = async (req, res) => {
  try {
    const { username, ip_address, mac_address, router, session_type } = req.body;
    if (!username) return res.status(400).json({ message: 'username is required' });

    const { rows } = await pool.query(
      `INSERT INTO active_sessions (username, ip_address, mac_address, router, session_type, session_start)
       VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
      [username, ip_address || null, mac_address || null, router || null, session_type || 'hotspot']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/active-sessions/:id/end
exports.endSession = async (req, res) => {
  try {
    const { bytes_in, bytes_out } = req.body;
    const { rows } = await pool.query(
      `UPDATE active_sessions SET
         session_end = NOW(),
         bytes_in    = COALESCE($1, bytes_in),
         bytes_out   = COALESCE($2, bytes_out)
       WHERE id = $3 RETURNING *`,
      [bytes_in || null, bytes_out || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Session not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
