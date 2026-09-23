const express = require('express');
const router = express.Router();
const { signup, login, refreshToken, logout } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { validate, signupSchema, loginSchema, refreshTokenSchema } = require('../middlewares/validate.middleware');
const rateLimit = require('express-rate-limit');

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/** POST /api/auth/signup */
router.post('/signup', authLimiter, validate(signupSchema), signup);

/** POST /api/auth/login */
router.post('/login', authLimiter, validate(loginSchema), login);

/** POST /api/auth/refresh-token */
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

/** POST /api/auth/logout */
router.post('/logout', protect, logout);

module.exports = router;
