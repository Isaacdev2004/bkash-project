const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const { connectDb } = require('./config/db');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    // Browsers reject credentials with wildcard origins
    credentials: env.CORS_ORIGIN !== '*',
  })
);
app.use(express.json({ limit: '24kb' }));
app.use(express.urlencoded({ extended: false, limit: '24kb' }));
app.use(mongoSanitize());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use(errorHandler);

async function main() {
  await connectDb();
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
