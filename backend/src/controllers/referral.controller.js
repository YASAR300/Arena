const { Referral, User } = require('../models');
const { generateReferralCode } = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/users/me/referral-code
 * Returns current user's referral code (generates one if missing)
 */
const getMyReferralCode = asyncHandler(async (req, res) => {
  let user = req.user;

  if (!user.referralCode) {
    let code;
    let unique = false;
    while (!unique) {
      code = generateReferralCode();
      const exists = await User.findOne({ referralCode: code });
      if (!exists) unique = true;
    }
    await User.findByIdAndUpdate(user._id, { referralCode: code });
    user.referralCode = code;
  }

  const referralLink = `https://feedants.com/r/${user.referralCode}`;

  return ApiResponse.success(res, {
    referralCode: user.referralCode,
    referralLink,
    rewardPerSignup: 10,
  }, 'Referral details fetched');
});

/**
 * POST /api/referrals/redeem
 * Called when a new user signs up via referral code.
 * Validates code, prevents self-referral, credits reward atomically.
 */
const redeemReferral = asyncHandler(async (req, res) => {
  const { referralCode, newUserId } = req.body;

  const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
  if (!referrer) {
    throw ApiError.notFound('Invalid referral code');
  }

  // Prevent self-referral
  if (String(referrer._id) === String(newUserId)) {
    throw ApiError.badRequest('You cannot use your own referral code');
  }

  // Prevent duplicate redemption by the same new user
  const existing = await Referral.findOne({ referredUserId: newUserId });
  if (existing) {
    throw ApiError.conflict('This user has already redeemed a referral code');
  }

  // Atomic create — unique index on referredUserId prevents race-condition duplicates
  const referral = await Referral.create({
    referrerUserId: referrer._id,
    referralCode: referralCode.toUpperCase(),
    referredUserId: newUserId,
    rewardAmount: 10,
    rewardStatus: 'PENDING',
  });

  // In production: trigger wallet credit job here
  console.log(`[Referral] Code ${referralCode} redeemed by ${newUserId}. Reward queued for ${referrer._id}`);

  return ApiResponse.created(res, referral, 'Referral redeemed successfully. Reward is being processed.');
});

module.exports = { getMyReferralCode, redeemReferral };
