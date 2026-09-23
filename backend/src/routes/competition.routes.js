const express = require('express');
const router = express.Router();
const {
  getCompetitionDetails,
  getCompetitionSpots,
  listCompetitions,
  listPreviousWinners,
} = require('../controllers/competition.controller');
const { protect, optionalAuth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Competitions
 *   description: Competition discovery and detail endpoints
 */

/** GET /api/competitions (Paginated) */
router.get('/', listCompetitions);

/** GET /api/competitions/series/:seriesId/winners (Paginated) */
router.get('/series/:seriesId/winners', listPreviousWinners);

/** GET /api/competitions/:id/spots (Lightweight polling) */
router.get('/:id/spots', getCompetitionSpots);

/** GET /api/competitions/:idOrSlug (Full details with Redis cache-aside) */
router.get('/:idOrSlug', optionalAuth, getCompetitionDetails);

module.exports = router;
