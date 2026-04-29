const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { ensureOperationalSchema } = require('./startup/ensureOperationalSchema');

dotenv.config();

const app = express();

const userRoutes = require('./routes/userRoutes');
const bundleRoutes = require('./routes/bundleRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const siteRoutes = require('./routes/siteRoutes');
const mikrotikRoutes = require('./routes/mikrotikRoutes');
const { errorHandler } = require('./middleware/errorHandler');

function getAllowedOrigins() {
  const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0
    ? configuredOrigins
    : ['http://localhost:3000', 'http://localhost:5173'];
}

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
}));

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin-users', require('./routes/adminUserRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/packages', require('./routes/packageRoutes'));
app.use('/api/payments', require('./routes/paymentsRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/vouchers', require('./routes/voucherRoutes'));
app.use('/api/sites', siteRoutes);
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/active-sessions', require('./routes/activeSessionRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/emails', require('./routes/emailRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/mikrotik', mikrotikRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  await ensureOperationalSchema();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

module.exports = app;
