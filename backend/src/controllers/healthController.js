const mongoose = require('mongoose');

function getHealth(_req, res) {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected ? 'API is healthy.' : 'Database connection is unavailable.',
    data: {
      status: databaseConnected ? 'ok' : 'degraded',
      database: databaseConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = { getHealth };
