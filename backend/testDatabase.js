const pool = require('./config/db');

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection...');
    console.log('Attempting to connect with:');
    console.log('  Host:', process.env.DB_HOST || 'localhost');
    console.log('  Port:', process.env.DB_PORT || 5433);
    console.log('  Database:', process.env.DB_NAME || 'bundles_system');
    console.log('  User:', process.env.DB_USER || 'postgres');
    console.log('');

    const client = await pool.connect();
    console.log('✓ Connected successfully!');

    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('✓ Query executed:', result.rows[0]);

    client.release();
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    console.error('');
    console.error('Debug info:');
    console.error('  Error code:', error.code);
    console.error('  Full error:', error);
    process.exit(1);
  }
}

testConnection();
