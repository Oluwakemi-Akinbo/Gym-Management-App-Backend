require('dotenv').config();

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

const parsedPort = Number(process.env.PORT || 5000);
const parsedRateWindow = Number(process.env.RATE_LIMIT_WINDOW_MS || 900000);
const parsedRateMax = Number(process.env.RATE_LIMIT_MAX || 100);

if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

module.exports = {
  port: parsedPort,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  rateLimitWindowMs: Number.isInteger(parsedRateWindow) && parsedRateWindow > 0 ? parsedRateWindow : 900000,
  rateLimitMax: Number.isInteger(parsedRateMax) && parsedRateMax > 0 ? parsedRateMax : 100
};
