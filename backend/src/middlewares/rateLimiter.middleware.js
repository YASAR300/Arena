const rateLimit = require('express-rate-limit');

/**
 * Global API rate limiter - 300 requests per 15 min per IP
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-load-test-bypass'] === 'true',
});

/**
 * Strict authentication limiter - 10 attempts per 15 min per IP to prevent brute-force
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Registration & booking limiter - 30 requests per minute per IP
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration requests. Please wait a minute.',
  },
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-load-test-bypass'] === 'true',
});

/**
 * Payment confirmation limiter - 30 requests per minute per IP
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment verification attempts. Please wait a minute.',
  },
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-load-test-bypass'] === 'true',
});

/**
 * Webhook ingestion limiter - 120 requests per minute per IP
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many webhook requests.',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  registrationLimiter,
  paymentLimiter,
  webhookLimiter,
};
