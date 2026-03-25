// Master database setup script - creates all tables and seeds all data
const { Pool } = require('pg');

// Step 1: Connect to postgres default DB to create the database
async function createDatabase() {
  const adminPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres',
    password: process.env.DB_PASSWORD || 'Postgre',
    port: process.env.DB_PORT || 5432,
  });

  try {
    const res = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = 'internet_distribution'`
    );
    if (res.rows.length === 0) {
      await adminPool.query('CREATE DATABASE internet_distribution');
      console.log('✅ Database "internet_distribution" created');
    } else {
      console.log('ℹ️  Database "internet_distribution" already exists');
    }
  } finally {
    await adminPool.end();
  }
}

// Step 2: Connect to the new database and create all tables + seed data
async function setupTables() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'internet_distribution',
    password: process.env.DB_PASSWORD || 'Postgre',
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('\n--- Creating tables ---\n');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        payment_method VARCHAR(50),
        address TEXT,
        pppoe_username VARCHAR(100),
        pppoe_password VARCHAR(100),
        bundle_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ users table ready');

    // Bundles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bundles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        speed INT,
        duration_days INT,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ bundles table ready');

    // Sessions table (with MikroTik columns)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bundle_id INT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        mikrotik_username VARCHAR(100),
        mikrotik_password VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, status)
      );
    `);
    console.log('✅ sessions table ready (with mikrotik columns)');

    // Transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        bundle_id INT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) NOT NULL,
        provider VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        mpesa_receipt VARCHAR(100),
        airtel_reference VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ transactions table ready');

    // --- Seed bundles ---
    console.log('\n--- Seeding bundles ---\n');

    const bundles = [
      { name: 'Basic',        price: 1500, speed: 25,  duration_days: 30, description: 'Perfect for light browsing and emails' },
      { name: 'Standard',     price: 2500, speed: 50,  duration_days: 30, description: 'Great for streaming and gaming' },
      { name: 'Premium',      price: 3500, speed: 100, duration_days: 30, description: 'Ultra-fast speeds for heavy users' },
      { name: 'Blazing',      price: 6000, speed: 250, duration_days: 30, description: 'Lightning-fast speeds for professionals' },
      { name: 'Weekly Basic', price:  500, speed: 20,  duration_days:  7, description: 'Affordable short-term plan' },
      { name: 'Monthly Pro',  price: 4500, speed: 150, duration_days: 30, description: 'Professional-grade internet connection' },
    ];

    for (const bundle of bundles) {
      // Use INSERT ... ON CONFLICT DO NOTHING so re-runs are safe
      const result = await pool.query(
        `INSERT INTO bundles (name, price, speed, duration_days, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [bundle.name, bundle.price, bundle.speed, bundle.duration_days, bundle.description]
      );
      if (result.rows.length > 0) {
        console.log(`  ✅ Inserted: ${bundle.name} — $${bundle.price} | ${bundle.speed} Mbps | ${bundle.duration_days} days`);
      } else {
        console.log(`  ℹ️  Already exists: ${bundle.name}`);
      }
    }

    // Final verification
    console.log('\n--- Verification ---\n');
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables in database:');
    tableCheck.rows.forEach(r => console.log('  •', r.table_name));

    const bundleCount = await pool.query('SELECT COUNT(*) FROM bundles');
    console.log(`\nTotal bundles in DB: ${bundleCount.rows[0].count}`);

    console.log('\n🎉 Database setup complete! Your system is ready to use.\n');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

async function main() {
  console.log('=== Internet Distribution System — Database Setup ===\n');
  await createDatabase();
  await setupTables();
}

main();
