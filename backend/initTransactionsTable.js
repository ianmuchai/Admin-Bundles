const pool = require('./config/db');

async function createTransactionsTable() {
  try {
    console.log('Creating transactions table...\n');

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
    console.log('✓ Transactions table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating transactions table:', error.message);
    process.exit(1);
  }
}

createTransactionsTable();
