const pool = require('../db');

const getBundles = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bundles');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bundles' });
  }
};

module.exports = { getBundles };