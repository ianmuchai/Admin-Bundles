const pool = require('./config/db');

async function addShortBundles() {
  const bundles = [
    { name: '1 Hour Unlimited',  price: 10, speed: 20, duration_days: 0, description: 'Unlimited browsing for 1 hour' },
    { name: '6 Hours Unlimited', price: 20, speed: 20, duration_days: 0, description: 'Unlimited browsing for 6 hours' },
    { name: 'Daily Unlimited',   price: 50, speed: 20, duration_days: 1, description: 'Unlimited browsing for 24 hours' },
  ];

  try {
    for (const b of bundles) {
      // Check if already exists
      const exists = await pool.query('SELECT id FROM bundles WHERE name = $1', [b.name]);
      if (exists.rows.length > 0) {
        console.log('Already exists:', b.name);
        continue;
      }
      const r = await pool.query(
        'INSERT INTO bundles (name, price, speed, duration_days, description) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, price',
        [b.name, b.price, b.speed, b.duration_days, b.description]
      );
      console.log('Inserted:', r.rows[0].name, '@ KES', r.rows[0].price);
    }
    const all = await pool.query('SELECT id, name, price, duration_days FROM bundles ORDER BY price');
    console.log('\nAll bundles:');
    all.rows.forEach(row => console.log(' ', row.id, row.name, 'KES', row.price, '/', row.duration_days, 'days'));
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    await pool.end();
    process.exit(1);
  }
}

addShortBundles();
