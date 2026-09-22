const path = require('path');
const http = require('http');
// Load environment variables (supports root .env or backend/.env)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Server } = require('socket.io');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

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
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join competition-specific room for real-time spots updates
  socket.on('join_competition', (competitionId) => {
    if (competitionId) {
      const room = `competition:${competitionId}`;
      socket.join(room);
      console.log(`[Socket.IO] Socket ${socket.id} joined room ${room}`);
    }
  });

  // Leave competition room
  socket.on('leave_competition', (competitionId) => {
    if (competitionId) {
      const room = `competition:${competitionId}`;
      socket.leave(room);
      console.log(`[Socket.IO] Socket ${socket.id} left room ${room}`);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected (${socket.id}): ${reason}`);
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
      console.log(`[Server] Feedants API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful Shutdown
const handleGracefulShutdown = (signal) => {
  console.log(`[Server] ${signal} received. Closing HTTP server and database connections...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    try {
      await disconnectDB();
      console.log('[Server] Graceful shutdown completed.');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during database disconnection:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('[Server] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
