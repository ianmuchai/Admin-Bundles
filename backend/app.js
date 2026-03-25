const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const app = express();

const userRoutes = require('./routes/userRoutes');
const bundleRoutes = require('./routes/bundleRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { errorHandler } = require('./middleware/errorHandler');

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.0.102:3000'],
  credentials: true
}));

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payment', paymentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;