const express = require('express');
const mongoose = require('mongoose');
const { redisClient, isRedisConnected } = require('../config/redis');

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness probe
 *     description: Returns 200 if Node.js process is alive and responsive
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'feedants-arena-backend',
  });
});

/**
 * @openapi
 * /ready:
 *   get:
 *     summary: Readiness probe
 *     description: Checks database and cache dependencies to ensure backend can serve traffic
 *     responses:
 *       200:
 *         description: All dependencies healthy
 *       503:
 *         description: One or more dependencies unhealthy
 */
router.get('/ready', async (req, res) => {
  const checks = {
    mongo: { status: 'down', latencyMs: null },
    redis: { status: 'down', latencyMs: null },
  };

  let isReady = true;

  // 1. Check MongoDB
  const mongoStart = Date.now();
  try {
    const mongoState = mongoose.connection.readyState;
    // 1 = connected
    if (mongoState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      checks.mongo = {
        status: 'up',
        latencyMs: Date.now() - mongoStart,
      };
    } else {
      checks.mongo = {
        status: 'down',
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState] || 'unknown',
      };
      isReady = false;
    }
  } catch (err) {
    checks.mongo = {
      status: 'down',
      error: err.message,
      latencyMs: Date.now() - mongoStart,
    };
    isReady = false;
  }

  // 2. Check Redis / Cache Layer
  const redisStart = Date.now();
  try {
    if (isRedisConnected()) {
      await redisClient.ping();
      checks.redis = {
        status: 'up',
        mode: 'standalone_redis',
        latencyMs: Date.now() - redisStart,
      };
    } else {
      // In-memory fallback is active and healthy
      await redisClient.set('__ready_check__', '1', 'EX', 5);
      const val = await redisClient.get('__ready_check__');
      checks.redis = {
        status: val === '1' ? 'up' : 'degraded',
        mode: 'in_memory_resilient_fallback',
        latencyMs: Date.now() - redisStart,
      };
    }
  } catch (err) {
    checks.redis = {
      status: 'down',
      error: err.message,
      latencyMs: Date.now() - redisStart,
    };
    if (process.env.STRICT_READY === 'true') {
      isReady = false;
    }
  }

  const statusCode = isReady ? 200 : 503;
  return res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    checks,
  });
});

module.exports = router;
