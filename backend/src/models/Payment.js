const mongoose = require('mongoose');

/**
 * Payment / Transaction Schema
 * Tracks payment orders, callbacks, and verification records for competition entry fees.
 */
const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for transaction'],
      index: true,
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: [true, 'Competition ID is required for transaction'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be >= 0'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    provider: {
      type: String,
      enum: ['razorpay'],
      default: 'razorpay',
    },
    providerOrderId: {
      type: String,
      index: true,
      trim: true,
    },
    providerPaymentId: {
      type: String,
      index: true,
      trim: true,
    },
    providerSignature: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['CREATED', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'CREATED',
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    refundId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for user transactions
paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
