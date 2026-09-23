const crypto = require('crypto');
const { Submission, Registration, Competition } = require('../models');
const ApiError = require('../utils/apiError');

/**
 * Submission Service
 *
 * DESIGN DECISION — Signed URL Upload Pattern:
 * ─────────────────────────────────────────────
 * WHY we do NOT proxy video uploads through Express:
 * 1. Large video files (50MB–500MB) would saturate Node.js event loop threads
 *    and exhaust server memory, making the API unresponsive for all other users.
 * 2. Direct-to-storage uploads (S3, Cloudinary) offload bandwidth and storage
 *    to CDN-backed infrastructure with built-in multipart, retry, and progress.
 * 3. Signed URL approach: backend generates a time-limited pre-signed URL,
 *    client uploads directly to S3/Cloudinary, then confirms with backend via
 *    a lightweight POST containing just the final mediaUrl.
 *
 * ASSUMPTION (noted in README): 1 submission per user per competition.
 * The schema enforces this with a unique index on registrationId.
 */

/**
 * Generate a pre-signed upload URL.
 * In production: use AWS SDK s3.createPresignedPost() or Cloudinary API.
 * Here: returns a mock signed URL structure for demo purposes.
 */
const generateSignedUploadUrl = async ({ competitionId, userId, fileName, fileType }) => {
  const competition = await Competition.findById(competitionId);
  if (!competition) throw ApiError.notFound('Competition not found');

  const now = new Date();
  if (now < competition.submissionStartAt || now > competition.submissionEndAt) {
    throw ApiError.badRequest('Submission window is not currently open');
  }

  const registration = await Registration.findOne({
    userId,
    competitionId,
    status: 'CONFIRMED',
  });
  if (!registration) {
    throw ApiError.forbidden('You must be a confirmed registrant to upload a submission');
  }

  // MOCK signed URL — replace with real AWS/Cloudinary SDK call in production
  const uploadKey = `submissions/${competitionId}/${userId}/${Date.now()}_${fileName}`;
  const mockSignedUrl = `https://feedants-submissions.s3.ap-south-1.amazonaws.com/${uploadKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=${crypto.randomBytes(20).toString('hex')}`;

  console.log(`[SubmissionService] Generated signed URL for ${uploadKey}`);

  return {
    uploadUrl: mockSignedUrl,
    key: uploadKey,
    expiresInSeconds: 3600,
    fields: { 'Content-Type': fileType },
  };
};

/**
 * Confirm submission after client has uploaded to storage
 */
const createSubmission = async ({ competitionId, userId, mediaUrl, mediaType, thumbnailUrl }) => {
  const competition = await Competition.findById(competitionId);
  if (!competition) throw ApiError.notFound('Competition not found');

  const now = new Date();
  if (now < competition.submissionStartAt || now > competition.submissionEndAt) {
    throw ApiError.badRequest('Submission window is not currently open');
  }

  const registration = await Registration.findOne({
    userId,
    competitionId,
    status: 'CONFIRMED',
  });

  if (!registration) {
    throw ApiError.forbidden('You must have a confirmed registration to submit');
  }

  // 1 submission per user enforced by schema unique index on registrationId
  const existing = await Submission.findOne({ registrationId: registration._id });
  if (existing) {
    throw ApiError.conflict('You have already submitted an entry for this competition');
  }

  const submission = await Submission.create({
    userId,
    competitionId,
    registrationId: registration._id,
    mediaUrl,
    mediaType,
    thumbnailUrl,
    submittedAt: new Date(),
    status: 'SUBMITTED',
  });

  return submission;
};

/**
 * Get current user's own submission
 */
const getMySubmission = async (competitionId, userId) => {
  const submission = await Submission.findOne({ userId, competitionId }).lean();
  return submission;
};

module.exports = { generateSignedUploadUrl, createSubmission, getMySubmission };
