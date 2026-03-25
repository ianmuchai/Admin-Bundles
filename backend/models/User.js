const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Helper to create a new user
async function createUser({
  username,
  password,
  phone_number,
  role = 'user',
  status = 'active',
  payment_method = null,
  address = null
}) {
  const hashedPassword = await bcrypt.hash(password, 12);
  const query = `
    INSERT INTO users (username, password, phone_number, role, status, payment_method, address, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *`;
  const values = [username, hashedPassword, phone_number, role, status, payment_method, address];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Helper to find a user by username or phone_number
async function findUserBy(field, value) {
  // Only allow certain fields to prevent SQL injection
  const allowedFields = ['username', 'phone_number', 'id'];
  if (!allowedFields.includes(field)) throw new Error('Invalid field');
  const query = `SELECT * FROM users WHERE ${field} = $1`;
  const { rows } = await pool.query(query, [value]);
  return rows[0];
}

// Helper to compare password
async function matchPassword(enteredPassword, hashedPassword) {
  return bcrypt.compare(enteredPassword, hashedPassword);
}

module.exports = {
  createUser,
  findUserBy,
  matchPassword
};