const express = require('express');
const { handleRazorpayWebhook } = require('../controllers/webhook.controller');

const router = express.Router();

/**
 * @openapi
 * /api/webhooks/razorpay:
 *   post:
 *     summary: Ingest Razorpay Webhook Events
 *     description: Validates HMAC-SHA256 signature in x-razorpay-signature header before processing
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 *       400:
 *         description: Missing signature
 *       401:
 *         description: Invalid signature
 */
router.post('/razorpay', handleRazorpayWebhook);

module.exports = router;
