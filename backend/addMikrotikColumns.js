// Add MikroTik credentials columns to sessions table
const pool = require('./config/db');

async function addMikrotikColumns() {
  try {
    console.log('Adding MikroTik columns to sessions table...\n');

    // Add mikrotik_username column
    console.log('Adding mikrotik_username column...');
    try {
      await pool.query(`
        ALTER TABLE sessions ADD COLUMN mikrotik_username VARCHAR(100)
      `);
      console.log('✅ mikrotik_username column added');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  mikrotik_username column already exists');
      } else {
        throw error;
      }
    }

    // Add mikrotik_password column
    console.log('Adding mikrotik_password column...');
    try {
      await pool.query(`
        ALTER TABLE sessions ADD COLUMN mikrotik_password VARCHAR(100)
      `);
      console.log('✅ mikrotik_password column added');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  mikrotik_password column already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Database update complete!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addMikrotikColumns();
