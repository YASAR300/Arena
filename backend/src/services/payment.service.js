/**
 * Mock Razorpay Payment Gateway Service
 *
 * PURPOSE:
 * This file mirrors the exact structure of real Razorpay SDK integration.
 * In production, replace the mock implementations below with actual Razorpay SDK calls.
 * The calling code (registration service) remains unchanged — only this service swaps.
 *
 * Real swap = npm install razorpay + configure Razorpay constructor with live keys.
 */

const crypto = require('crypto');

// Stub: In production → `new Razorpay({ key_id, key_secret })`
const MOCK_RAZORPAY_KEY = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock';
const MOCK_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';

/**
 * Create a Razorpay payment order
 * Real: razorpay.orders.create({ amount, currency, receipt, notes })
 */
const createOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  // MOCK: generate a fake order ID that follows Razorpay's format
  const mockOrderId = `order_${crypto.randomBytes(10).toString('hex')}`;

  console.log(`[PaymentGateway] Created mock order ${mockOrderId} for ₹${amount / 100}`);

  return {
    id: mockOrderId,
    entity: 'order',
    amount,
    amount_paid: 0,
    amount_due: amount,
    currency,
    receipt,
    status: 'created',
    notes,
    // In real integration this would be returned from Razorpay servers
    key: MOCK_RAZORPAY_KEY,
  };
};

/**
 * Verify Razorpay webhook signature
 * Real: crypto HMAC-SHA256 verification using razorpay_order_id + razorpay_payment_id
 *
 * WHY this matters:
 * Never trust the client claiming payment succeeded. Always verify the HMAC signature
 * using your Razorpay key_secret server-side to prove the callback genuinely came
 * from Razorpay servers.
 */
const verifyPaymentSignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', MOCK_SECRET)
    .update(body)
    .digest('hex');

  // MOCK: In test environment always return true for mock payment IDs
  if (razorpay_payment_id.startsWith('pay_mock_')) {
    console.log('[PaymentGateway] Mock payment signature verified successfully');
    return true;
  }

  const isValid = expectedSignature === razorpay_signature;
  console.log(`[PaymentGateway] Signature verification: ${isValid ? 'VALID' : 'INVALID'}`);
  return isValid;
};

/**
 * Initiate a refund
 * Real: razorpay.payments.refund(paymentId, { amount, speed: 'normal' })
 */
const initiateRefund = async ({ paymentId, amount, notes = {} }) => {
  const mockRefundId = `rfnd_${crypto.randomBytes(8).toString('hex')}`;

  console.log(
    `[PaymentGateway] Mock refund initiated: ${mockRefundId} for payment ${paymentId} ₹${amount / 100}`
  );

  return {
    id: mockRefundId,
    entity: 'refund',
    payment_id: paymentId,
    amount,
    status: 'processed',
    notes,
  };
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  initiateRefund,
};
