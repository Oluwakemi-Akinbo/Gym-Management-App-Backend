const app = require('./app');
const connectDatabase = require('./config/database');
const env = require('./config/env');

let server;

async function start() {
  await connectDatabase();
  server = app.listen(env.port, () => {
    console.log(`Gym Management API listening on port ${env.port}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('Unable to start the API:', error.message);
  process.exit(1);
});
