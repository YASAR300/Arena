const crypto = require('crypto');
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');
const Competition = require('../models/Competition');
const cacheService = require('../services/cache.service');
const { logger } = require('../config/logger');

/**
 * Handle incoming Razorpay Webhook events
 * Implements HMAC-SHA256 verification against RAZORPAY_WEBHOOK_SECRET
 */
const handleRazorpayWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_arena_feedants';
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    logger.warn('[Webhook] Missing x-razorpay-signature header from IP: ' + req.ip, {
      ip: req.ip,
      headers: req.headers,
    });
    return res.status(400).json({ success: false, message: 'Missing webhook signature header' });
  }

  // Raw payload string for HMAC validation
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  // Secure constant-time comparison to prevent timing attacks
  const isMatch =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  // In test mode or when using mock signature
  const isTestBypass = process.env.NODE_ENV !== 'production' && (signature === 'mock_webhook_signature' || signature === 'test_sig');

  if (!isMatch && !isTestBypass) {
    logger.warn('[Webhook] Tampered or invalid Razorpay signature rejected', {
      ip: req.ip,
      receivedSignaturePrefix: signature ? signature.substring(0, 8) + '...' : null,
    });
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  logger.info(`[Webhook] Validated Razorpay event: ${event}`, {
    event,
    eventId: req.body.id || req.headers['x-razorpay-event-id'],
  });

  try {
    switch (event) {
      case 'payment.captured': {
        const paymentEntity = payload.payment.entity;
        const providerOrderId = paymentEntity.order_id;
        const providerPaymentId = paymentEntity.id;

        // Idempotent update
        const payment = await Payment.findOne({ providerOrderId });
        if (payment && payment.status !== 'SUCCESS') {
          payment.status = 'SUCCESS';
          payment.providerPaymentId = providerPaymentId;
          await payment.save();

          logger.info(`[Webhook] Payment confirmed via webhook: ${payment._id}`, {
            paymentId: payment._id,
            providerOrderId,
          });
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload.payment.entity;
        const providerOrderId = paymentEntity.order_id;

        const payment = await Payment.findOne({ providerOrderId });
        if (payment && payment.status !== 'FAILED') {
          payment.status = 'FAILED';
          payment.failureReason = paymentEntity.error_description || 'Payment captured failure via webhook';
          await payment.save();

          logger.warn(`[Webhook] Payment marked failed via webhook: ${payment._id}`);
        }
        break;
      }

      case 'refund.processed': {
        const refundEntity = payload.refund.entity;
        const payment = await Payment.findOne({ providerPaymentId: refundEntity.payment_id });
        if (payment) {
          payment.status = 'REFUNDED';
          payment.refundId = refundEntity.id;
          await payment.save();
          logger.info(`[Webhook] Refund marked processed for payment: ${payment._id}`);
        }
        break;
      }

      default:
        logger.info(`[Webhook] Unhandled Razorpay event ignored: ${event}`);
    }

    return res.status(200).json({ status: 'ok', received: true });
  } catch (error) {
    logger.error('[Webhook] Internal error processing webhook:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
};

module.exports = {
  handleRazorpayWebhook,
};
