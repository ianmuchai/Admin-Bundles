// Database initialization script - creates all necessary tables
const pool = require('./config/db');

async function initDatabase() {
  try {
    console.log('Initializing database tables...\n');

    // Create sessions table
    console.log('Creating sessions table...');
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          bundle_id INT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
          expires_at TIMESTAMP NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, status)
        )
      `);
      console.log('✅ Sessions table ready');
    } catch (tableError) {
      console.log('Sessions table error:', tableError.message);
      throw tableError;
    }

    console.log('\n✅ Database initialization complete!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

initDatabase();
