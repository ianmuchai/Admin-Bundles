/**
 * initAdminISP.js
 * Run once to create tables and seed the default superadmin:
 *   node initAdminISP.js
 *
 * Requires a .env file with DB_* and JWT_SECRET set.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'adminisp',
  password: process.env.DB_PASSWORD || 'postgres',
  port:     parseInt(process.env.DB_PORT || '5432'),
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Run schema — strip the placeholder INSERT at the bottom so we can
    //    seed with a real bcrypt hash below. node-postgres supports multi-
    //    statement plain-text queries (no bound parameters).
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const ddlOnly = schema.split(/^INSERT INTO admin_users/m)[0];
    await client.query(ddlOnly);
    console.log('✔ Schema applied');

    // 2. Seed superadmin with a real bcrypt hash
    const defaultPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin@1234';
    const hashed = await bcrypt.hash(defaultPassword, 12);
    await client.query(
      `INSERT INTO admin_users (name, email, password, role)
       VALUES ($1, $2, $3, 'superadmin')
       ON CONFLICT (email) DO NOTHING`,
      ['Super Admin', 'admin@isp.local', hashed]
    );
    console.log(`✔ Superadmin seeded  (email: admin@isp.local  password: ${defaultPassword})`);
    console.log('⚠  CHANGE THE DEFAULT PASSWORD before going to production!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Init failed:', err.message);
  process.exit(1);
});
