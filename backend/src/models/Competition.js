const mongoose = require('mongoose');

/**
 * Reward Subdocument Schema (Embedded)
 * Rationale:
 * - Reward structure is specific and atomic to each competition.
 * - It is always retrieved alongside competition details and has a fixed, small size (e.g. 1st to 6th rank).
 */
const rewardBreakupSchema = new mongoose.Schema(
  {
    rank: {
      type: Number,
      required: [true, 'Rank number is required'],
    },
    prizeAmount: {
      type: Number,
      required: [true, 'Prize amount is required'],
      min: [0, 'Prize amount cannot be negative'],
    },
    label: {
      type: String,
      required: [true, 'Reward label is required'], // e.g. "1st Winner", "2nd Winner"
      trim: true,
    },
    iconType: {
      type: String,
      enum: ['trophy', 'gold_medal', 'silver_medal', 'bronze_medal', 'star'],
      default: 'star',
    },
  },
  { _id: false }
);

/**
 * Competition Schema
 * Represents competition lifecycle, pricing, deadlines, spots, and content.
 */
const competitionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Competition title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Competition slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    categoryTags: {
      type: [String],
      default: ['Dance'],
      validate: {
        validator: (tags) => Array.isArray(tags) && tags.length > 0,
        message: 'At least one category tag is required',
      },
    },
    competitionType: {
      type: String,
      default: 'Multi-Win',
      trim: true,
    },
    certificateEligible: {
      type: Boolean,
      default: true, // "Winners get certificate" badge
    },
    description: {
      type: String,
      required: [true, 'About competition description is required'],
      trim: true,
    },
    judgingParameters: {
      type: String,
      default: 'Evaluated on Rhythm & Timing (30%), Technique & Posture (30%), Facial Expressions / Abhinaya (25%), and Overall Presentation & Attire (15%).',
      trim: true,
    },
    rulesAndEligibility: {
      type: String,
      default: '1. Open to all age groups across India.\n2. Video duration must be between 60 to 180 seconds.\n3. Clear audio and visible full-body performance required.\n4. No edited or sped-up clips allowed.',
      trim: true,
    },
    prizePool: {
      type: Number,
      required: [true, 'Prize pool amount is required'],
      min: [0, 'Prize pool must be >= 0'],
    },
    entryFee: {
      type: Number,
      required: [true, 'Entry fee is required'],
      min: [0, 'Entry fee must be >= 0'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: '₹',
      trim: true,
    },
    totalSpots: {
      type: Number,
      required: [true, 'Total spots capacity is required'],
      min: [1, 'Total spots must be at least 1'],
    },
    /**
     * spotsBooked:
     * IMPORTANT CONCURRENCY NOTE:
     * Do NOT increment this via standard `doc.spotsBooked++` followed by `doc.save()`.
     * To prevent race conditions and overbooking under high concurrency, always update atomically:
     * `Competition.findOneAndUpdate({ _id, spotsBooked: { $lt: totalSpots } }, { $inc: { spotsBooked: 1 } })`
     */
    spotsBooked: {
      type: Number,
      default: 0,
      min: [0, 'Spots booked cannot be negative'],
    },
    // Lifecycle Milestones (All stored in UTC, converted on client)
    registrationStartAt: {
      type: Date,
      required: [true, 'Registration start date is required'],
    },
    registrationEndAt: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    submissionStartAt: {
      type: Date,
      required: [true, 'Submission start date is required'],
    },
    submissionEndAt: {
      type: Date,
      required: [true, 'Submission deadline is required'],
    },
    resultDate: {
      type: Date,
      required: [true, 'Result announcement date is required'],
    },
    // Stored status (periodically updated via scheduled jobs or transitions)
    status: {
      type: String,
      enum: [
        'DRAFT',
        'UPCOMING',
        'REGISTRATION_OPEN',
        'REGISTRATION_CLOSED',
        'SUBMISSION_OPEN',
        'SUBMISSION_CLOSED',
        'RESULTS_DECLARED',
        'CANCELLED',
      ],
      default: 'REGISTRATION_OPEN',
    },
    // Reference to Judge
    judge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Judge',
      required: [true, 'Competition must be assigned an adjudicating Judge'],
    },
    // Rank-wise reward breakup
    rewards: [rewardBreakupSchema],
    // Disclaimers & Policies
    disclaimers: {
      type: [String],
      default: ['Only contributions from paid participants will be considered for judging.'],
    },
    refundPolicyText: {
      type: String,
      default: 'Entry fee is fully refundable until 24 hours before registration closes. Non-refundable once submission window begins.',
    },
    prizeMoneyInfoVideoUrl: {
      type: String,
      default: 'https://feedants.com/videos/how-to-receive-prize-money.mp4',
    },
    referralRewardAmount: {
      type: Number,
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Spots remaining
competitionSchema.virtual('spotsLeft').get(function () {
  return Math.max(0, this.totalSpots - this.spotsBooked);
});

// Virtual: Is sold out
competitionSchema.virtual('isSoldOut').get(function () {
  return this.spotsBooked >= this.totalSpots;
});

// Dynamic status calculation on-the-fly from UTC timestamps
competitionSchema.methods.calculateDerivedStatus = function () {
  if (this.status === 'DRAFT' || this.status === 'CANCELLED') {
    return this.status;
  }

  const now = new Date();

  if (now < this.registrationStartAt) {
    return 'UPCOMING';
  }
  if (now <= this.registrationEndAt && !this.isSoldOut) {
    return 'REGISTRATION_OPEN';
  }
  if (now > this.registrationEndAt && now < this.submissionStartAt) {
    return 'REGISTRATION_CLOSED';
  }
  if (now >= this.submissionStartAt && now <= this.submissionEndAt) {
    return 'SUBMISSION_OPEN';
  }
  if (now > this.submissionEndAt && now < this.resultDate) {
    return 'SUBMISSION_CLOSED';
  }
  if (now >= this.resultDate) {
    return 'RESULTS_DECLARED';
  }

  return this.status;
};

// Compound & Single Indexes for Optimized Query Performance
competitionSchema.index({ slug: 1, isActive: 1 });
competitionSchema.index({ status: 1, registrationEndAt: 1 });
competitionSchema.index({ isActive: 1, registrationStartAt: -1 });
competitionSchema.index({ isActive: 1, spotsBooked: 1, totalSpots: 1 });

const Competition = mongoose.model('Competition', competitionSchema);
module.exports = Competition;
