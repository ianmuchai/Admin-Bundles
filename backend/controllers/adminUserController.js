const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/admin-users
exports.listAdminUsers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM admin_users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/admin-users
exports.createAdminUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'name, email and password are required' });

    const allowedRoles = ['superadmin', 'admin', 'support'];
    const userRole = allowedRoles.includes(role) ? role : 'support';

    const exists = await pool.query('SELECT id FROM admin_users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (exists.rows.length > 0)
      return res.status(409).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO admin_users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email.toLowerCase(), hashed, userRole]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin-users/:id
exports.deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id)
      return res.status(400).json({ message: 'Cannot delete your own account' });
    await pool.query('DELETE FROM admin_users WHERE id = $1', [id]);
    res.json({ message: 'Admin user deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
