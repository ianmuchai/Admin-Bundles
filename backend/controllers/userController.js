const User = require('../models/User');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register
exports.registerUser = async (req, res) => {
  const { username, password, phone_number, role, status, payment_method, address } = req.body;
  if (!username || !password || !phone_number) return res.status(400).json({ message: 'All fields required' });

  // Check if user exists by username or phone_number
  const userExists = await User.findUserBy('username', username) || await User.findUserBy('phone_number', phone_number);
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  // Create user
  const user = await User.createUser({ username, password, phone_number, role, status, payment_method, address });
  res.status(201).json({
    id: user.id,
    username: user.username,
    phone_number: user.phone_number,
    role: user.role,
    status: user.status,
    payment_method: user.payment_method,
    address: user.address,
    token: generateToken(user.id)
  });
};

// Login
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'All fields required' });

  const user = await User.findUserBy('username', username);
  if (!user || !(await User.matchPassword(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({
    id: user.id,
    username: user.username,
    phone_number: user.phone_number,
    role: user.role,
    status: user.status,
    payment_method: user.payment_method,
    address: user.address,
    token: generateToken(user.id)
  });
};

// Update Profile
exports.updateProfile = async (req, res) => {
  const user = await User.findUserBy('id', req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const newUsername = req.body.username || user.username;
  const newPhoneNumber = req.body.phone_number || user.phone_number;
  let newPassword = user.password;
  if (req.body.password) {
    newPassword = await bcrypt.hash(req.body.password, 12);
  }
  const newRole = req.body.role || user.role;
  const newStatus = req.body.status || user.status;
  const newPaymentMethod = req.body.payment_method || user.payment_method;
  const newAddress = req.body.address || user.address;

  const query = `UPDATE users SET username = $1, phone_number = $2, password = $3, role = $4, status = $5, payment_method = $6, address = $7 WHERE id = $8 RETURNING *`;
  const values = [newUsername, newPhoneNumber, newPassword, newRole, newStatus, newPaymentMethod, newAddress, user.id];
  const { rows } = await pool.query(query, values);
  const updatedUser = rows[0];
  const { password, ...userData } = updatedUser;
  res.json({
    ...userData,
    token: generateToken(updatedUser.id)
  });
};


exports.getProfile = async (req, res) => {
  try {
    const user = await User.findUserBy('id', req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...userData } = user;
    res.json(userData);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};