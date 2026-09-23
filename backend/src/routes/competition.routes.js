const express = require('express');
const router = express.Router();
const { getCompetitionDetails, getCompetitionSpots } = require('../controllers/competition.controller');
const { protect, optionalAuth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Competitions
 *   description: Competition discovery and detail endpoints
 */

/**
 * @swagger
 * /api/competitions/{idOrSlug}:
 *   get:
 *     summary: Full competition details (auth optional — returns currentUserState if logged in)
 *     tags: [Competitions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Competition MongoDB ID or URL slug
 *     responses:
 *       200:
 *         description: Competition details with currentUserState
 *       404:
 *         description: Competition not found
 */
router.get('/:idOrSlug', optionalAuth, getCompetitionDetails);

/**
 * @swagger
 * /api/competitions/{id}/spots:
 *   get:
 *     summary: Lightweight spots polling endpoint (public)
 *     tags: [Competitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Spot counts and registration deadline
 */
router.get('/:id/spots', getCompetitionSpots);

module.exports = router;
