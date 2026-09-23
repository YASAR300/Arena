const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Sensitive keys that must be masked in structured logs
const SENSITIVE_KEYS = [
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'authorization',
  'cardNumber',
  'card',
  'cvv',
  'razorpay_signature',
  'razorpay_payment_id',
  'secret',
  'key_secret',
];

/**
 * Recursively mask sensitive fields in objects before logging
 */
function maskSensitiveData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  const masked = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitive) =>
      lowerKey.includes(sensitive.toLowerCase())
    );

    if (isSensitive) {
      masked[key] = typeof value === 'string' && value.length > 8
        ? `${value.substring(0, 4)}****${value.substring(value.length - 4)}`
        : '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

// Custom format to mask sensitive data
const maskFormat = winston.format((info) => {
  return maskSensitiveData(info);
});

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    maskFormat(),
    isProduction
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
          const reqTag = requestId ? ` [${requestId}]` : '';
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] [${level.toUpperCase()}]${reqTag} ${message}${metaStr}`;
        })
  ),
  defaultMeta: { service: 'feedants-arena-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Express middleware to attach a unique correlation/request ID to each request
 * and create a request-scoped logger child
 */
function requestLoggerMiddleware(req, res, next) {
  const correlationId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || uuidv4();
  req.id = correlationId;
  res.setHeader('X-Request-Id', correlationId);

  req.logger = logger.child({
    requestId: correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
  });

  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      requestId: correlationId,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}

module.exports = {
  logger,
  requestLoggerMiddleware,
  maskSensitiveData,
};
