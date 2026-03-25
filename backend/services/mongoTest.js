const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bundles_system',
  password: 'your_password',
  port: 5432,
});

async function run() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL!');
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await pool.end();
  }
}

run();