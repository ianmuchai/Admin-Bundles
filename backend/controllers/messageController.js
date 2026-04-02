const pool = require('../config/db');

// GET /api/messages?search=…
exports.listMessages = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    let params = [];
    if (search) {
      where = `WHERE (recipient ILIKE $1 OR body ILIKE $1)`;
      params.push(`%${search}%`);
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM messages ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    const idx = params.length + 1;

    const { rows } = await pool.query(
      `SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ total, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/messages/send  { client_id?, recipient, body, gateway? }
exports.sendMessage = async (req, res) => {
  try {
    const { client_id, recipient, body, gateway } = req.body;
    if (!recipient || !body)
      return res.status(400).json({ message: 'recipient and body are required' });

    // TODO: Integrate with actual SMS gateway (Africa's Talking, Twilio, etc.)
    // For now, record as sent
    const { rows } = await pool.query(
      `INSERT INTO messages (client_id, recipient, body, status, gateway)
       VALUES ($1,$2,$3,'sent',$4) RETURNING *`,
      [client_id || null, recipient, body, gateway || 'manual']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/messages/bulk  { client_ids: [...], body }
exports.sendBulkMessages = async (req, res) => {
  try {
    const { client_ids, body } = req.body;
    if (!body || !Array.isArray(client_ids) || client_ids.length === 0)
      return res.status(400).json({ message: 'body and client_ids array are required' });

    const { rows: clients } = await pool.query(
      'SELECT id, phone FROM clients WHERE id = ANY($1::int[])',
      [client_ids]
    );

    const inserted = [];
    for (const client of clients) {
      if (!client.phone) continue;
      const { rows } = await pool.query(
        `INSERT INTO messages (client_id, recipient, body, status, gateway)
         VALUES ($1,$2,$3,'sent','bulk') RETURNING *`,
        [client.id, client.phone, body]
      );
      inserted.push(rows[0]);
    }

    res.status(201).json({ sent: inserted.length, messages: inserted });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
