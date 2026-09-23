const path = require('path');
const http = require('http');
// Load environment variables (supports root .env or backend/.env)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Server } = require('socket.io');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { startLifecycleJob } = require('./jobs/lifecycle.job');

const { logger } = require('./config/logger');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
});

// Socket.IO Room Management for Competitions
io.on('connection', (socket) => {
  logger.info(`[Socket.IO] Client connected: ${socket.id}`);

  // Join competition-specific room for real-time spots updates
  socket.on('join_competition', (competitionId) => {
    if (competitionId) {
      const room = `competition:${competitionId}`;
      socket.join(room);
      logger.debug(`[Socket.IO] Socket ${socket.id} joined room ${room}`);
    }
  });

  // Leave competition room
  socket.on('leave_competition', (competitionId) => {
    if (competitionId) {
      const room = `competition:${competitionId}`;
      socket.leave(room);
      logger.debug(`[Socket.IO] Socket ${socket.id} left room ${room}`);
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info(`[Socket.IO] Client disconnected (${socket.id}): ${reason}`);
  });
});

// Attach io instance to app for use in controllers/services
app.set('io', io);

// Start server after DB connection
const startServer = async () => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
    }

    server.listen(PORT, () => {
      logger.info(`Feedants API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`API Docs available at http://localhost:${PORT}/api-docs`);
      logger.info(`Health check at http://localhost:${PORT}/health, Readiness at http://localhost:${PORT}/ready`);
      // Start competition lifecycle monitoring job
      startLifecycleJob(io);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
const handleGracefulShutdown = (signal) => {
  logger.info(`${signal} received. Closing HTTP server and database connections...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await disconnectDB();
      logger.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
