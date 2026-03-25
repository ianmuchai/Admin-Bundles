const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  port: 5433,
  password: 'Postgre'
});

pool.query('CREATE DATABASE bundles_system;')
  .then(() => {
    console.log('✓ Database created successfully');
    process.exit(0);
  })
  .catch(err => {
    if (err.message.includes('already exists')) {
      console.log('ℹ Database already exists');
      process.exit(0);
    }
    console.error('✗ Error:', err.message);
    process.exit(1);
  });
