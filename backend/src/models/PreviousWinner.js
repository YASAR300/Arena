const mongoose = require('mongoose');

/**
 * PreviousWinner Schema
 * Represents historical winners showcased in the horizontal carousel.
 *
 * Architecture Note on Series:
 * "Previous Winners" implies recurring competitions over time. We store a `seriesId`
 * (e.g. "feedants-classical-dance") to associate winners with a recurring competition franchise,
 * while also linking optionally to specific prior `competitionId` documents.
 */
const previousWinnerSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      index: true,
    },
    seriesId: {
      type: String,
      required: [true, 'Competition series ID is required'],
      trim: true,
      index: true,
    },
    participantName: {
      type: String,
      required: [true, 'Winner participant name is required'],
      trim: true,
    },
    rank: {
      type: Number,
      required: [true, 'Winner rank is required'],
      min: 1,
    },
    rankLabel: {
      type: String,
      required: [true, 'Rank label is required'], // e.g. "1st Winner", "2nd Winner"
      trim: true,
    },
    photoUrl: {
      type: String,
      required: [true, 'Winner photo/thumbnail URL is required'],
      trim: true,
    },
    videoUrl: {
      type: String,
      trim: true,
    },
    season: {
      type: String,
      default: 'Season 1 - 2025',
      trim: true,
    },
    performanceTitle: {
      type: String,
      trim: true, // e.g. "Kathak Tarana Performance"
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to quickly fetch winners sorted by rank within a series
previousWinnerSchema.index({ seriesId: 1, rank: 1 });

const PreviousWinner = mongoose.model('PreviousWinner', previousWinnerSchema);
module.exports = PreviousWinner;
