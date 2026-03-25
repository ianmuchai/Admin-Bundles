const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', // your PostgreSQL username
  host: 'localhost',
  database: 'bundles_system', // your database name
  password: 'postgres',   // your PostgreSQL password
  port: 5432,                  // your PostgreSQL port
});

module.exports = pool;