require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'adminisp',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || 'postgres')
});

const NEW_PASSWORD = 'Admin@1234';

bcrypt.hash(NEW_PASSWORD, 12).then(async hash => {
  await pool.query('UPDATE admin_users SET password = $1 WHERE email = $2', [hash, 'admin@isp.local']);
  console.log('Password reset successfully.');
  console.log('Email:    admin@isp.local');
  console.log('Password: ' + NEW_PASSWORD);
  pool.end();
}).catch(e => {
  console.error('ERROR:', e.message);
  pool.end();
});
