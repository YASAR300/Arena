const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health Check ─────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Feedants Competition API is operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Swagger API Documentation ─────────────────────────────────────────
const swaggerSpec = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Feedants Arena API Docs',
  customCss: '.swagger-ui .topbar { background-color: #005F60; }',
}));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── API Routes ────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const competitionRoutes = require('./routes/competition.routes');
const registrationRoutes = require('./routes/registration.routes');
const submissionRoutes = require('./routes/submission.routes');
const miscRoutes = require('./routes/misc.routes');

app.use('/api/auth', authRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/competitions/:id/register', registrationRoutes);
app.use('/api/competitions/:id/submissions', submissionRoutes);
app.use('/api', miscRoutes);

// ── Error Handling ────────────────────────────────────────────────────
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
