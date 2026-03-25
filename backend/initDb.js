const pool = require('./config/db');

async function initializeDatabase() {
  try {
    console.log('Initializing database schema...\n');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        pppoe_username VARCHAR(100),
        pppoe_password VARCHAR(100),
        bundle_type VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created users table');

    // Create bundles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bundles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        speed VARCHAR(50),
        duration_days INT,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created bundles table');

    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bundle_id INT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, status)
      );
    `);
    console.log('✓ Created sessions table');

    console.log('\n✓ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error initializing database:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
