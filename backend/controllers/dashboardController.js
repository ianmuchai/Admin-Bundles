const pool = require('../config/db');

// GET /api/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const [clients, active, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM clients'),
      pool.query("SELECT COUNT(*) FROM active_sessions WHERE session_end IS NULL"),
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS revenue
         FROM payments
         WHERE status = 'checked'
           AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)`
      ),
    ]);

    res.json({
      totalUsers: parseInt(clients.rows[0].count),
      activeUsers: parseInt(active.rows[0].count),
      monthlyRevenue: parseFloat(revenue.rows[0].revenue),
      expiryDate: null, // subscription expiry, not implemented
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/dashboard/total-users
exports.getTotalUsers = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM clients');
    res.json({ totalUsers: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/dashboard/active-users
exports.getActiveUsers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) FROM active_sessions WHERE session_end IS NULL"
    );
    res.json({ activeUsers: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/dashboard/monthly-revenue
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS revenue
       FROM payments
       WHERE status = 'checked'
         AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)`
    );
    res.json({ monthlyRevenue: parseFloat(rows[0].revenue) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/dashboard/charts?category=Payments&timeframe=This Month
exports.getChartData = async (req, res) => {
  try {
    const { category, timeframe } = req.query;

    const dateFilter = buildDateFilter(timeframe);

    let data = [];

    switch (category) {
      case 'Payments':
      case 'Revenue': {
        const { rows } = await pool.query(
          `SELECT TO_CHAR(payment_date, 'Mon') AS name,
                  SUM(amount) AS value
           FROM payments
           WHERE status = 'checked' ${dateFilter}
           GROUP BY TO_CHAR(payment_date, 'Mon'), EXTRACT(MONTH FROM payment_date)
           ORDER BY EXTRACT(MONTH FROM payment_date)`
        );
        data = rows.map(r => ({ name: r.name, value: parseFloat(r.value) }));
        break;
      }
      case 'Registrations': {
        const { rows } = await pool.query(
          `SELECT TO_CHAR(created_at, 'Mon') AS name,
                  COUNT(*) AS value
           FROM clients
           WHERE true ${dateFilter.replace('payment_date', 'created_at::date')}
           GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
           ORDER BY EXTRACT(MONTH FROM created_at)`
        );
        data = rows.map(r => ({ name: r.name, value: parseInt(r.value) }));
        break;
      }
      case 'Active Users': {
        const { rows } = await pool.query(
          `SELECT TO_CHAR(session_start, 'Dy') AS day,
                  COUNT(CASE WHEN session_type = 'hotspot' THEN 1 END) AS hotspot,
                  COUNT(CASE WHEN session_type = 'pppoe'   THEN 1 END) AS pppoe
           FROM active_sessions
           WHERE session_start >= NOW() - INTERVAL '7 days'
           GROUP BY TO_CHAR(session_start, 'Dy'), EXTRACT(DOW FROM session_start)
           ORDER BY EXTRACT(DOW FROM session_start)`
        );
        data = rows.map(r => ({
          day: r.day,
          hotspot: parseInt(r.hotspot),
          pppoe: parseInt(r.pppoe),
        }));
        break;
      }
      case 'Expenses': {
        const { rows } = await pool.query(
          `SELECT TO_CHAR(expense_date, 'Mon') AS name,
                  SUM(amount) AS value
           FROM expenses
           WHERE true ${dateFilter.replace('payment_date', 'expense_date')}
           GROUP BY TO_CHAR(expense_date, 'Mon'), EXTRACT(MONTH FROM expense_date)
           ORDER BY EXTRACT(MONTH FROM expense_date)`
        );
        data = rows.map(r => ({ name: r.name, value: parseFloat(r.value) }));
        break;
      }
      default:
        data = [];
    }

    res.json(data);
  } catch (err) {
    console.error('getChartData error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

function buildDateFilter(timeframe) {
  switch (timeframe) {
    case 'Today':        return `AND payment_date = CURRENT_DATE`;
    case 'This Week':    return `AND payment_date >= DATE_TRUNC('week', CURRENT_DATE)`;
    case 'Last Week':    return `AND payment_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days' AND payment_date < DATE_TRUNC('week', CURRENT_DATE)`;
    case 'This Month':   return `AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)`;
    case 'Last Month':   return `AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'`;
    case 'This Year':    return `AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
    default:             return `AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
  }
}
