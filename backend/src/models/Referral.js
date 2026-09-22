const mongoose = require('mongoose');

/**
 * Referral Schema
 * Tracks referrals generated via the "Refer & Earn" block ("You earn ₹10 for every signup").
 */
const referralSchema = new mongoose.Schema(
  {
    referrerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Referrer user ID is required'],
      index: true,
    },
    referralCode: {
      type: String,
      required: [true, 'Referral code is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    rewardAmount: {
      type: Number,
      default: 10, // ₹10 per signup
      min: [0, 'Reward amount cannot be negative'],
    },
    rewardStatus: {
      type: String,
      enum: ['PENDING', 'CREDITED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
referralSchema.index({ referrerUserId: 1, createdAt: -1 });

const Referral = mongoose.model('Referral', referralSchema);
module.exports = Referral;
