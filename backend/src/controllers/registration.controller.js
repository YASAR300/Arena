const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const registrationService = require('../services/registration.service');

/**
 * POST /api/competitions/:id/register/initiate-payment
 * Step 1: Create Razorpay order for entry fee
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { id: competitionId } = req.params;
  const userId = req.user._id;
  const { referralCode } = req.body || {};

  const result = await registrationService.initiatePaymentForRegistration(competitionId, userId, referralCode);
  return ApiResponse.created(res, result, 'Payment order created. Complete payment to confirm registration.');
});

/**
 * POST /api/competitions/:id/register/confirm
 * Step 2: Verify payment signature and atomically book spot + create Registration
 */
const confirmRegistration = asyncHandler(async (req, res) => {
  const { id: competitionId } = req.params;
  const userId = req.user._id;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const result = await registrationService.confirmRegistration({
    competitionId,
    userId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  // Emit socket event for real-time spots update
  const io = req.app.get('io');
  if (io) {
    io.to(`competition:${competitionId}`).emit('competition:spotsUpdated', {
      competitionId,
      spotsLeft: result.spotsLeft,
    });
  }

  return ApiResponse.created(res, result.registration, 'Registration confirmed successfully!');
});

/**
 * POST /api/competitions/:id/register/cancel
 * Cancel a confirmed registration (blocked after submission starts)
 */
const cancelRegistration = asyncHandler(async (req, res) => {
  const { id: competitionId } = req.params;
  const userId = req.user._id;

  const result = await registrationService.cancelRegistration(competitionId, userId);

  // Emit updated spots
  const io = req.app.get('io');
  if (io) {
    const { getCompetitionSpots } = require('../services/competition.service');
    const spots = await getCompetitionSpots(competitionId);
    if (spots) {
      io.to(`competition:${competitionId}`).emit('competition:spotsUpdated', {
        competitionId,
        spotsLeft: spots.spotsLeft,
      });
    }
  }

  return ApiResponse.success(res, null, result.message);
});

module.exports = { initiatePayment, confirmRegistration, cancelRegistration };
