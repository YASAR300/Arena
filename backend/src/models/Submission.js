const mongoose = require('mongoose');

/**
 * Submission Schema
 * Stores participant media uploads for competition evaluation.
 *
 * Relationships:
 * - `userId` (ref: User)
 * - `competitionId` (ref: Competition)
 * - `registrationId` (ref: Registration, 1-to-1 unique relation per confirmed entry)
 */
const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for submission'],
      index: true,
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: [true, 'Competition ID is required for submission'],
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: [true, 'Registration ID is required to associate submission with paid registration'],
      unique: true, // Only one submission allowed per registration entry
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media upload URL is required'],
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ['video/mp4', 'video/quicktime', 'url'],
      default: 'video/mp4',
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'DISQUALIFIED'],
      default: 'SUBMITTED',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
submissionSchema.index({ competitionId: 1, userId: 1 });
submissionSchema.index({ competitionId: 1, status: 1 });

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission;
