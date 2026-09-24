const crypto = require('crypto');
const mongoose = require('mongoose');
const { Submission, Registration, Competition } = require('../models');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');

/**
 * Robust helper to resolve competition whether passed as an ObjectId or as a slug
 */
const findCompetition = async (idOrSlug) => {
  if (!idOrSlug || idOrSlug === 'undefined' || idOrSlug === 'null') return null;
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    const comp = await Competition.findById(idOrSlug);
    if (comp) return comp;
  }
  return await Competition.findOne({ slug: idOrSlug });
};

/**
 * Generate a pre-signed upload URL for Cloudinary.
 * Client uploads directly to Cloudinary with real signature and receives CDN URL.
 */
const generateSignedUploadUrl = async ({ competitionId, userId, fileName, fileType }) => {
  const competition = await findCompetition(competitionId);
  if (!competition) throw ApiError.notFound('Competition not found');

  const now = new Date();
  if (now < competition.submissionStartAt || now > competition.submissionEndAt) {
    throw ApiError.badRequest('Submission window is not currently open');
  }

  const registration = await Registration.findOne({
    userId,
    competitionId: competition._id,
    status: 'CONFIRMED',
  });
  if (!registration) {
    throw ApiError.forbidden('You must be a confirmed registrant to upload a submission');
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = `feedants_arena/submissions/${competition._id}`;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // Calculate HMAC signature according to Cloudinary spec
  const paramsToSign = {
    folder,
    timestamp,
  };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const uploadKey = `${folder}/${Date.now()}_${fileName || 'media'}`;

  console.log(`[SubmissionService] Generated Cloudinary signed parameters for ${uploadKey}`);

  return {
    uploadUrl,
    apiKey,
    timestamp,
    signature,
    folder,
    cloudName,
    key: uploadKey,
    expiresInSeconds: 3600,
    fields: {
      api_key: apiKey,
      timestamp,
      signature,
      folder,
      'Content-Type': fileType,
    },
  };
};

/**
 * Confirm submission after client has uploaded to Cloudinary
 */
const createSubmission = async ({ competitionId, userId, mediaUrl, mediaType, thumbnailUrl }) => {
  const competition = await findCompetition(competitionId);
  if (!competition) throw ApiError.notFound('Competition not found');

  const now = new Date();
  if (now < competition.submissionStartAt || now > competition.submissionEndAt) {
    throw ApiError.badRequest('Submission window is not currently open');
  }

  const registration = await Registration.findOne({
    userId,
    competitionId: competition._id,
    status: 'CONFIRMED',
  });

  if (!registration) {
    throw ApiError.forbidden('You must have a confirmed registration to submit');
  }

  // Allow edit/replace before deadline: if already submitted, update mediaUrl
  const existing = await Submission.findOne({ registrationId: registration._id });
  if (existing) {
    existing.mediaUrl = mediaUrl;
    existing.mediaType = mediaType;
    if (thumbnailUrl) existing.thumbnailUrl = thumbnailUrl;
    existing.submittedAt = new Date();
    await existing.save();
    return existing;
  }

  const submission = await Submission.create({
    userId,
    competitionId: competition._id,
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
  const competition = await findCompetition(competitionId);
  if (!competition) return null;
  const submission = await Submission.findOne({ userId, competitionId: competition._id }).lean();
  return submission;
};

module.exports = {
  findCompetition,
  generateSignedUploadUrl,
  createSubmission,
  getMySubmission,
};
