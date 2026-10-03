const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const planRoutes = require('./routes/planRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    data: null
  }
}));

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gym Management API is running.',
    data: { health: `${env.apiPrefix}/health` }
  });
});

app.use(`${env.apiPrefix}/health`, healthRoutes);
app.use(`${env.apiPrefix}/auth`, authRoutes);
app.use(`${env.apiPrefix}/users`, userRoutes);
app.use(`${env.apiPrefix}/members`, memberRoutes);
app.use(`${env.apiPrefix}/plans`, planRoutes);
app.use(`${env.apiPrefix}/trainers`, trainerRoutes);
app.use(`${env.apiPrefix}/payments`, paymentRoutes);
app.use(`${env.apiPrefix}/attendance`, attendanceRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
