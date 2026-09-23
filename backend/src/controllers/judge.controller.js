const { PreviousWinner, Judge } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/** GET /api/competitions/:id/previous-winners */
const getPreviousWinners = asyncHandler(async (req, res) => {
  const { id: competitionId } = req.params;
  const { seriesId } = req.query;

  // Use provided seriesId or fall back to competitionId
  const query = seriesId ? { seriesId } : { competitionId };
  const winners = await PreviousWinner.find(query).sort({ rank: 1 }).limit(20).lean();

  return ApiResponse.success(res, winners, 'Previous winners fetched');
});

/** GET /api/judges/:id */
const getJudge = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const judge = await Judge.findById(id).lean();
  if (!judge) throw ApiError.notFound('Judge not found');
  return ApiResponse.success(res, judge, 'Judge details fetched');
});

module.exports = { getPreviousWinners, getJudge };
