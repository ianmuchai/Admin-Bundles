const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET || 'change_me_in_production', { expiresIn: '12h' });

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const { rows } = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const { password: _pw, ...safeUser } = user;
    res.json({ ...safeUser, token: generateToken(user.id, user.role) });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM admin_users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both passwords are required' });
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const { rows } = await pool.query('SELECT * FROM admin_users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE admin_users SET password = $1, updated_at = NOW() WHERE id = $2', [
      hashed,
      req.user.id,
    ]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
