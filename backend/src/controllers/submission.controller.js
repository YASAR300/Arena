const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const submissionService = require('../services/submission.service');
const { Submission } = require('../models');
const { parsePagination, formatPaginatedResponse } = require('../utils/pagination');

/** GET /api/competitions/:id/submissions/signed-url */
const getSignedUploadUrl = asyncHandler(async (req, res) => {
  const { id: competitionId } = req.params;
  const { fileName, fileType } = req.query;
  const userId = req.user._id;

  if (!fileName || !fileType) {
    throw ApiError.badRequest('fileName and fileType query params are required');
  }

  const result = await submissionService.generateSignedUploadUrl({
    competitionId, userId, fileName, fileType,
  });
  return ApiResponse.success(res, result, 'Signed upload URL generated');
});

/** POST /api/competitions/:id/submissions */
const createSubmission = asyncHandler(async (req, res) => {
  const { id: competitionId } = req.params;
  const userId = req.user._id;
  const { mediaUrl, mediaType, thumbnailUrl } = req.body;

  const submission = await submissionService.createSubmission({
    competitionId, userId, mediaUrl, mediaType, thumbnailUrl,
  });
  return ApiResponse.created(res, submission, 'Submission recorded successfully');
});

/** GET /api/competitions/:id/submissions/me */
const getMySubmission = asyncHandler(async (req, res) => {
  const { id: competitionId } = req.params;
  const userId = req.user._id;

  const submission = await submissionService.getMySubmission(competitionId, userId);
  if (!submission) {
    throw ApiError.notFound('No submission found for this competition');
  }
  return ApiResponse.success(res, submission, 'Submission fetched');
});

/** GET /api/competitions/:id/submissions (Paginated submissions list for judging / admin) */
const listSubmissions = asyncHandler(async (req, res) => {
  const { id: competitionId } = req.params;
  const { page, limit, skip } = parsePagination(req.query);
  const { status } = req.query;

  const filter = { competitionId };
  if (status) filter.status = status;

  const [submissions, total] = await Promise.all([
    Submission.find(filter)
      .populate('userId', 'name email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Submission.countDocuments(filter),
  ]);

  const paginated = formatPaginatedResponse({
    data: submissions,
    total,
    page,
    limit,
  });

  return ApiResponse.success(res, paginated, 'Submissions list fetched');
});

module.exports = {
  getSignedUploadUrl,
  createSubmission,
  getMySubmission,
  listSubmissions,
};
