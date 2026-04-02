const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const app = express();

// ── Middleware ───────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// ── Legacy routes (kept for backward compatibility) ──────────
const userRoutes    = require('./routes/userRoutes');
const bundleRoutes  = require('./routes/bundleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/users',   userRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/payment', paymentRoutes);

// ── AdminISP routes ──────────────────────────────────────────
app.use('/api/auth',            require('./routes/authRoutes'));
app.use('/api/admin-users',     require('./routes/adminUserRoutes'));
app.use('/api/dashboard',       require('./routes/dashboardRoutes'));
app.use('/api/clients',         require('./routes/clientRoutes'));
app.use('/api/packages',        require('./routes/packageRoutes'));
app.use('/api/payments',        require('./routes/paymentsRoutes'));
app.use('/api/tickets',         require('./routes/ticketRoutes'));
app.use('/api/vouchers',        require('./routes/voucherRoutes'));
app.use('/api/sites',           require('./routes/siteRoutes'));
app.use('/api/leads',           require('./routes/leadRoutes'));
app.use('/api/expenses',        require('./routes/expenseRoutes'));
app.use('/api/active-sessions', require('./routes/activeSessionRoutes'));
app.use('/api/messages',        require('./routes/messageRoutes'));
app.use('/api/emails',          require('./routes/emailRoutes'));
app.use('/api/campaigns',       require('./routes/campaignRoutes'));

// ── Error handler ────────────────────────────────────────────
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;