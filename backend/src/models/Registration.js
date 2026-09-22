const mongoose = require('mongoose');

/**
 * Registration Schema
 * Join model between User and Competition.
 *
 * CRITICAL CONCURRENCY NOTE:
 * Relying solely on application-level checks (e.g., `const existing = await Registration.findOne({ userId, competitionId })`)
 * fails under concurrent requests (e.g. user double-clicking payment button or automated parallel requests).
 * A race condition occurs in the time gap between `findOne` (check) and `save` (insert) (Time-of-Check to Time-of-Use).
 * A database-level compound unique index on `{ userId: 1, competitionId: 1 }` guarantees zero duplicate registrations
 * at the storage engine level with MongoDB E11000 duplicate key error enforcement.
 */
const registrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for registration'],
      index: true,
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: [true, 'Competition ID is required for registration'],
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    entryFeePaid: {
      type: Number,
      required: [true, 'Entry fee paid is required'],
      min: [0, 'Fee cannot be negative'],
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    status: {
      type: String,
      enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED'],
      default: 'CONFIRMED',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound UNIQUE index to prevent duplicate registrations under concurrent requests
registrationSchema.index({ userId: 1, competitionId: 1 }, { unique: true });

// Compound index to quickly fetch active registrations by competition
registrationSchema.index({ competitionId: 1, status: 1 });

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;
