const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const competitionService = require('../services/competition.service');
const { Competition, PreviousWinner } = require('../models');
const { parsePagination, formatPaginatedResponse } = require('../utils/pagination');

/**
 * GET /api/competitions/:idOrSlug
 * Full competition details with Redis cache-aside
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
 * GET /api/competitions/:id/spots
 * Lightweight spots polling endpoint
 */
const getCompetitionSpots = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const spots = await competitionService.getCompetitionSpots(id);

  if (!spots) {
    throw ApiError.notFound('Competition not found');
  }

  return ApiResponse.success(res, spots, 'Spots data fetched');
});

/**
 * GET /api/competitions
 * Paginated list of competitions with category filter
 */
const listCompetitions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, status } = req.query;

  const filter = { isActive: true };
  if (category && category !== 'All') {
    filter.categoryTags = category;
  }
  if (status) {
    filter.status = status;
  }

  const [competitions, total] = await Promise.all([
    Competition.find(filter)
      .populate('judge', 'name photoUrl designation')
      .sort({ registrationStartAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Competition.countDocuments(filter),
  ]);

  const paginated = formatPaginatedResponse({
    data: competitions,
    total,
    page,
    limit,
  });

  return ApiResponse.success(res, paginated, 'Competitions list fetched');
});

/**
 * GET /api/competitions/series/:seriesId/winners
 * Paginated list of historical winners for a series
 */
const listPreviousWinners = asyncHandler(async (req, res) => {
  const { seriesId } = req.params;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { seriesId };
  const [winners, total] = await Promise.all([
    PreviousWinner.find(filter)
      .sort({ rank: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PreviousWinner.countDocuments(filter),
  ]);

  const paginated = formatPaginatedResponse({
    data: winners,
    total,
    page,
    limit,
  });

  return ApiResponse.success(res, paginated, 'Previous winners fetched');
});

module.exports = {
  getCompetitionDetails,
  getCompetitionSpots,
  listCompetitions,
  listPreviousWinners,
};
