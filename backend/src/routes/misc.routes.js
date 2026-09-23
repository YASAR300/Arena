const express = require('express');
const router = express.Router();
const { getPreviousWinners, getJudge } = require('../controllers/judge.controller');
const { getMyReferralCode, redeemReferral } = require('../controllers/referral.controller');
const { protect } = require('../middlewares/auth.middleware');
const { validate, redeemReferralSchema } = require('../middlewares/validate.middleware');

// ── Previous Winners ─────────────────────────────────────────────────────────
router.get('/competitions/:id/previous-winners', getPreviousWinners);

// ── Judge ────────────────────────────────────────────────────────────────────
router.get('/judges/:id', getJudge);

// ── Referral ─────────────────────────────────────────────────────────────────
router.get('/users/me/referral-code', protect, getMyReferralCode);
router.post('/referrals/redeem', validate(redeemReferralSchema), redeemReferral);

module.exports = router;
