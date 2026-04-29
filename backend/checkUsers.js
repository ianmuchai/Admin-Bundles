require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'adminisp',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || 'postgres')
});

pool.query('SELECT id, name, email, role, created_at FROM admin_users ORDER BY id')
  .then(r => {
    if (r.rows.length === 0) {
      console.log('No admin users found in database.');
    } else {
      console.log('Admin users in database:');
      r.rows.forEach(u => console.log(` - [${u.id}] ${u.email} | role: ${u.role} | name: ${u.name}`));
    }
    pool.end();
  })
  .catch(e => {
    console.error('DB ERROR:', e.message);
    pool.end();
  });
