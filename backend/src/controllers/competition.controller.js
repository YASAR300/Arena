const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const competitionService = require('../services/competition.service');

/**
 * @swagger
 * /api/competitions/{idOrSlug}:
 *   get:
 *     summary: Get full competition details with computed user CTA state
 *     tags: [Competitions]
 */
const getCompetitionDetails = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const userId = req.user ? req.user._id : null;

  const competition = await competitionService.getCompetitionDetails(idOrSlug, userId);
  if (!competition) {
    throw ApiError.notFound(`Competition '${idOrSlug}' not found`);
  }

  return ApiResponse.success(res, competition, 'Competition details fetched successfully');
});

/**
 * @swagger
 * /api/competitions/{id}/spots:
 *   get:
 *     summary: Lightweight spots polling endpoint
 *     tags: [Competitions]
 */
const getCompetitionSpots = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const spots = await competitionService.getCompetitionSpots(id);

  if (!spots) {
    throw ApiError.notFound('Competition not found');
  }

  return ApiResponse.success(res, spots, 'Spots data fetched');
});

module.exports = { getCompetitionDetails, getCompetitionSpots };
