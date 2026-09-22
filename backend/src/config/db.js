const mongoose = require('mongoose');

/**
 * MongoDB Atlas connection manager with production connection pooling
 * Configured for high concurrency (concurrent registration & spot booking)
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  const options = {
    // High-concurrency connection pool settings
    maxPoolSize: 50, // Maintain up to 50 socket connections
    minPoolSize: 10, // Maintain at least 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    autoIndex: process.env.NODE_ENV !== 'production', // Build indexes in dev, rely on migrations in prod
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected. Attempting reconnect...');
    });

    return conn;
  } catch (error) {
    console.error('[Database] Initial connection error:', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('[Database] MongoDB connection closed.');
};

module.exports = {
  connectDB,
  disconnectDB,
};
