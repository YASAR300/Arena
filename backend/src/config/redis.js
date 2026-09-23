const Redis = require('ioredis');

/**
 * Redis Client Configuration with In-Memory Fallback Adapter
 * 
 * In production or Docker, connects to the Redis instance.
 * If Redis is unavailable (e.g., during local testing or minimal development),
 * seamlessly falls back to an in-memory key-value cache with TTL eviction,
 * ensuring 100% resilience without crashing the server.
 */

let client = null;
let isConnected = false;

// High-speed in-memory store for fallback
const memoryStore = new Map();

const memoryFallbackClient = {
  isFallback: true,
  async get(key) {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },
  async set(key, value, mode, duration) {
    let expiresAt = null;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    }
    memoryStore.set(key, { value, expiresAt });
    return 'OK';
  },
  async del(key) {
    return memoryStore.delete(key) ? 1 : 0;
  },
  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matching = [];
    for (const key of memoryStore.keys()) {
      if (regex.test(key)) matching.push(key);
    }
    return matching;
  },
  async flushall() {
    memoryStore.clear();
    return 'OK';
  },
  status: 'ready_fallback',
};

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

try {
  client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      if (times > 2) {
        return null; // Stop retrying and stay on memory fallback
      }
      return 1000;
    },
  });

  client.on('connect', () => {
    isConnected = true;
    console.log('[Redis] Connected to Redis server successfully.');
  });

  client.on('error', (err) => {
    if (isConnected) {
      console.warn('[Redis] Connection lost. Falling back to in-memory caching:', err.message);
    }
    isConnected = false;
  });
} catch (err) {
  console.warn('[Redis] Unable to initialize Redis client. Using in-memory fallback:', err.message);
  client = memoryFallbackClient;
}

// Wrapper that transparently routes to Redis or fallback
const redisProxy = new Proxy({}, {
  get(target, prop) {
    if (isConnected && client && typeof client[prop] === 'function') {
      return client[prop].bind(client);
    }
    if (typeof memoryFallbackClient[prop] === 'function') {
      return memoryFallbackClient[prop].bind(memoryFallbackClient);
    }
    return Reflect.get(target, prop);
  }
});

module.exports = {
  redisClient: redisProxy,
  isRedisConnected: () => isConnected,
};
