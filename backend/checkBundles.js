const pool = require('./config/db');

async function checkBundles() {
  try {
    // Check if bundles exist
    const result = await pool.query('SELECT * FROM bundles ORDER BY price ASC');
    
    console.log('\n=== BUNDLES IN DATABASE ===');
    if (result.rows.length === 0) {
      console.log('❌ No bundles found in database!\n');
      console.log('Would you like to add sample bundles? (Run insertBundles.js)\n');
    } else {
      console.log(`✅ Found ${result.rows.length} bundles:\n`);
      console.table(result.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking bundles:', error.message);
    console.error('\nMake sure:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database "bundles_system" exists');
    console.error('3. Bundles table is created');
    console.error('4. Database credentials in config/db.js are correct\n');
    process.exit(1);
  }
}

checkBundles();
