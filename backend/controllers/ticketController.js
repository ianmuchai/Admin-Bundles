const pool = require('../config/db');

// Helper to generate ticket number
async function nextTicketNumber() {
  const year = new Date().getFullYear();
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM tickets WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year]
  );
  const seq = parseInt(rows[0].count) + 1;
  return `TKT-${year}-${String(seq).padStart(3, '0')}`;
}

// GET /api/tickets?status=open&search=…
exports.listTickets = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [];
    let params = [];
    let idx = 1;

    if (status) {
      conditions.push(`t.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(
        `(t.ticket_number ILIKE $${idx} OR t.customer_name ILIKE $${idx} OR t.subject ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM tickets t ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT t.*, c.username AS client_username
       FROM tickets t
       LEFT JOIN clients c ON t.client_id = c.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ total, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tickets/:id
exports.getTicket = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Ticket not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/tickets
exports.createTicket = async (req, res) => {
  try {
    const { client_id, customer_name, subject, description, priority } = req.body;
    if (!customer_name || !subject || !description)
      return res.status(400).json({ message: 'customer_name, subject and description are required' });

    const allowedPriority = ['low', 'medium', 'high'];
    const ticketNumber = await nextTicketNumber();

    const { rows } = await pool.query(
      `INSERT INTO tickets (ticket_number, client_id, customer_name, subject, description, status, priority)
       VALUES ($1,$2,$3,$4,$5,'open',$6)
       RETURNING *`,
      [
        ticketNumber,
        client_id || null,
        customer_name,
        subject,
        description,
        allowedPriority.includes(priority) ? priority : 'medium',
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/tickets/:id/status  { status: "open" | "closed" | "in_progress" }
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'closed', 'in_progress'];
    if (!allowed.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const { rows } = await pool.query(
      'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Ticket not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/tickets/:id
exports.deleteTicket = async (req, res) => {
  try {
    await pool.query('DELETE FROM tickets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tickets/counts
exports.getTicketCounts = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT status, COUNT(*) AS cnt FROM tickets GROUP BY status');
    const counts = { open: 0, closed: 0, in_progress: 0 };
    rows.forEach(r => { counts[r.status] = parseInt(r.cnt); });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
