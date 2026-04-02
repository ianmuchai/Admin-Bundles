const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_me_in_production');
    const { rows } = await pool.query(
      'SELECT id, name, email, role FROM admin_users WHERE id = $1',
      [decoded.id]
    );
    if (!rows[0]) return res.status(401).json({ message: 'Not authorized, user not found' });
    req.user = rows[0];
    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};
