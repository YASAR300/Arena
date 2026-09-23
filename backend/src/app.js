const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const { requestLoggerMiddleware } = require('./config/logger');
const { noSqlSanitizer, xssSanitizer } = require('./middlewares/sanitization.middleware');
const {
  globalLimiter,
  authLimiter,
  webhookLimiter,
} = require('./middlewares/rateLimiter.middleware');

const app = express();

// ── 1. Security HTTP Headers (Helmet with Content-Security-Policy) ─────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── 2. Strict CORS Whitelist Configuration ────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://localhost:19006',
      'https://arena-wog5.onrender.com',
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser agents (mobile app, cURL, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.startsWith('exp://') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Blocked by CORS whitelist policy: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Load-Test-Bypass'],
  credentials: true,
};
app.use(cors(corsOptions));

// ── 3. Structured Request Logger & Trace Correlation ID ───────────────
app.use(requestLoggerMiddleware);

// ── 4. Body Parsers with Raw Body Capture for Webhook HMAC Validation ─
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 5. Input Sanitization (NoSQL Injection & XSS) ─────────────────────
app.use(noSqlSanitizer);
app.use(xssSanitizer);

// ── 6. Tuned Rate Limiters ────────────────────────────────────────────
app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── 7. Health & Readiness Probes for Orchestration / Load Balancers ───
const healthRoutes = require('./routes/health.routes');
app.use('/', healthRoutes);
app.use('/api/v1', healthRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Feedants Arena Backend API',
    status: 'online',
    documentation: '/api-docs',
    healthCheck: '/health',
    readinessCheck: '/ready',
    timestamp: new Date().toISOString(),
  });
});

// ── 8. Swagger API Documentation ──────────────────────────────────────
const swaggerSpec = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Feedants Arena API Docs',
  customCss: '.swagger-ui .topbar { background-color: #005F60; }',
}));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── 9. Application Routes ─────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const competitionRoutes = require('./routes/competition.routes');
const registrationRoutes = require('./routes/registration.routes');
const submissionRoutes = require('./routes/submission.routes');
const miscRoutes = require('./routes/misc.routes');
const webhookRoutes = require('./routes/webhook.routes');

app.use('/api/auth', authRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/competitions/:id/register', registrationRoutes);
app.use('/api/competitions/:id/submissions', submissionRoutes);
app.use('/api/webhooks', webhookLimiter, webhookRoutes);
app.use('/api', miscRoutes);

// ── 10. Centralized Error Handling ────────────────────────────────────
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
