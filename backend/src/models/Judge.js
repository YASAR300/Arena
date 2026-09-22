const mongoose = require('mongoose');

/**
 * Judge Schema
 * Represents expert adjudicators for competitions (e.g. Manju Dubey, Professional Kathak Dancer).
 *
 * Relationship Rationale:
 * - Kept as a separate referenced collection (NOT embedded in Competition) because:
 *   1. A single prominent judge can adjudicate multiple competitions and recurring seasons.
 *   2. Updating judge bio, profile image, or intro video updates all associated competitions automatically.
 */
const judgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Judge name is required'],
      trim: true,
      maxlength: [120, 'Judge name cannot exceed 120 characters'],
    },
    photoUrl: {
      type: String,
      required: [true, 'Judge photo URL is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Judge designation is required'],
      trim: true, // e.g. "Professional Kathak Dancer"
    },
    bio: {
      type: String,
      trim: true,
    },
    experienceYears: {
      type: Number,
      required: [true, 'Years of experience is required'],
      min: [0, 'Experience years cannot be negative'], // e.g. 12+ Years
    },
    introVideoUrl: {
      type: String,
      trim: true,
    },
    socialLinks: {
      instagram: { type: String, trim: true },
      youtube: { type: String, trim: true },
      website: { type: String, trim: true },
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

// Indexes
judgeSchema.index({ name: 1 });
judgeSchema.index({ isActive: 1 });

const Judge = mongoose.model('Judge', judgeSchema);
module.exports = Judge;
