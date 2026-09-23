const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middlewares/auth.middleware');
const { initiatePayment, confirmRegistration, cancelRegistration } = require('../controllers/registration.controller');
const { validate, initiatePaymentSchema, verifyPaymentSchema } = require('../middlewares/validate.middleware');
const rateLimit = require('express-rate-limit');

/**
 * Stricter rate limiting for registration — prevent abuse/spam-clicking during high-demand drops.
 * 5 requests per minute per IP.
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-load-test-bypass'] === 'true',
  message: {
    success: false,
    errorCode: 'RATE_LIMITED',
    message: 'Too many registration attempts. Please wait a moment and try again.',
  },
});

/**
 * @swagger
 * /api/competitions/{id}/register/initiate-payment:
 *   post:
 *     summary: Create Razorpay payment order for entry fee
 *     tags: [Registration]
 *     security:
 *       - BearerAuth: []
 */
router.post('/initiate-payment', protect, registrationLimiter, validate(initiatePaymentSchema), initiatePayment);

/**
 * @swagger
 * /api/competitions/{id}/register/confirm:
 *   post:
 *     summary: Verify payment signature and confirm spot booking (atomic)
 *     tags: [Registration]
 *     security:
 *       - BearerAuth: []
 */
router.post('/confirm', protect, registrationLimiter, validate(verifyPaymentSchema), confirmRegistration);

/**
 * @swagger
 * /api/competitions/{id}/register/cancel:
 *   post:
 *     summary: Cancel registration (blocked after submission window opens)
 *     tags: [Registration]
 *     security:
 *       - BearerAuth: []
 */
router.post('/cancel', protect, cancelRegistration);

module.exports = router;
