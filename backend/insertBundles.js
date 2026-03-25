const pool = require('./config/db');

async function insertSampleBundles() {
  try {
    // Sample bundles data
    const bundles = [
      { name: 'Basic', price: 1500, speed: 25, duration_days: 30, description: 'Perfect for light browsing and emails' },
      { name: 'Standard', price: 2500, speed: 50, duration_days: 30, description: 'Great for streaming and gaming' },
      { name: 'Premium', price: 3500, speed: 100, duration_days: 30, description: 'Ultra-fast speeds for heavy users' },
      { name: 'Blazing', price: 6000, speed: 250, duration_days: 30, description: 'Lightning-fast speeds for professionals' },
      { name: 'Weekly Basic', price: 500, speed: 20, duration_days: 7, description: 'Affordable short-term plan' },
      { name: 'Monthly Pro', price: 4500, speed: 150, duration_days: 30, description: 'Professional-grade internet connection' }
    ];

    console.log('⚡ Inserting sample bundles...\n');

    for (const bundle of bundles) {
      const query = `
        INSERT INTO bundles (name, price, speed, duration_days, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [bundle.name, bundle.price, bundle.speed, bundle.duration_days, bundle.description];
      const result = await pool.query(query, values);
      
      if (result.rows.length > 0) {
        console.log(`✓ Added: ${bundle.name} - $${bundle.price}/month (${bundle.speed} Mbps)`);
      }
    }

    console.log('\n✓ Sample bundles inserted successfully!');
    console.log('Refresh your browser to see the bundles on the frontend.\n');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error inserting bundles:', error.message);
    process.exit(1);
  }
}

insertSampleBundles();
