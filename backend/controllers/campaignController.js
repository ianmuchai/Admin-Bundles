const pool = require('../config/db');

// GET /api/campaigns?search=…&type=sms
exports.listCampaigns = async (req, res) => {
  try {
    const { search, type, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [];
    let params = [];
    let idx = 1;

    if (type) {
      conditions.push(`type = $${idx++}`);
      params.push(type);
    }
    if (search) {
      conditions.push(`(title ILIKE $${idx} OR message ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM campaigns ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT * FROM campaigns ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ total, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/campaigns
exports.createCampaign = async (req, res) => {
  try {
    const { title, type, message, target_group, scheduled_at } = req.body;
    if (!title || !message)
      return res.status(400).json({ message: 'title and message are required' });

    const allowedTypes = ['sms', 'email', 'both'];
    const allowedTargets = ['all', 'active', 'expired', 'leads'];

    const { rows } = await pool.query(
      `INSERT INTO campaigns (title, type, message, target_group, status, scheduled_at)
       VALUES ($1,$2,$3,$4,'draft',$5) RETURNING *`,
      [
        title,
        allowedTypes.includes(type) ? type : 'sms',
        message,
        allowedTargets.includes(target_group) ? target_group : 'all',
        scheduled_at || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/campaigns/:id/send — dispatch campaign
exports.sendCampaign = async (req, res) => {
  try {
    const { rows: camp } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!camp[0]) return res.status(404).json({ message: 'Campaign not found' });

    const campaign = camp[0];

    // Determine target recipients
    let clientQuery = 'SELECT id, phone, email FROM clients';
    if (campaign.target_group === 'active')    clientQuery += ` WHERE status = 'Active'`;
    if (campaign.target_group === 'expired')   clientQuery += ` WHERE status = 'Expired'`;

    const { rows: clients } = await pool.query(clientQuery);

    let sent = 0;
    for (const client of clients) {
      if ((campaign.type === 'sms' || campaign.type === 'both') && client.phone) {
        await pool.query(
          `INSERT INTO messages (client_id, recipient, body, status, gateway)
           VALUES ($1,$2,$3,'sent','campaign')`,
          [client.id, client.phone, campaign.message]
        );
        sent++;
      }
      if ((campaign.type === 'email' || campaign.type === 'both') && client.email) {
        await pool.query(
          `INSERT INTO emails (client_id, recipient, subject, body, status)
           VALUES ($1,$2,$3,$4,'sent')`,
          [client.id, client.email, campaign.title, campaign.message]
        );
        sent++;
      }
    }

    // Mark campaign as sent
    await pool.query(
      `UPDATE campaigns SET status = 'sent', sent_count = $1 WHERE id = $2`,
      [sent, req.params.id]
    );

    res.json({ message: 'Campaign dispatched', sent });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/campaigns/:id
exports.deleteCampaign = async (req, res) => {
  try {
    await pool.query('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
