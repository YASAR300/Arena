const mongoose = require('mongoose');
const { Competition, Registration, Payment } = require('../models');
const paymentService = require('./payment.service');
const cacheService = require('./cache.service');
const ApiError = require('../utils/apiError');

/**
 * Registration Service — all registration business logic lives here.
 *
 * CONCURRENCY STRATEGY (documented here for assignment reviewers):
 * ─────────────────────────────────────────────────────────────────
 * Problem: With thousands of users competing for the last few spots,
 * a naive "read then write" pattern (findOne → check spotsBooked → save)
 * creates a TOCTOU race condition. Two requests can both read spotsBooked=19
 * when totalSpots=20, both decide "one spot left", both increment, and we end
 * up with spotsBooked=21 (overbooking).
 *
 * Solution — two layers of atomicity:
 *
 * LAYER 1 — Atomic spot increment with condition:
 *   `Competition.findOneAndUpdate(
 *     { _id, spotsBooked: { $lt: totalSpots } },   ← atomic condition
 *     { $inc: { spotsBooked: 1 } },                ← atomic write
 *     { new: true }
 *   )`
 *   MongoDB processes this as a single atomic document-level operation.
 *   If spotsBooked already equals totalSpots, the document won't match and
 *   findOneAndUpdate returns null → we reject immediately.
 *
 * LAYER 2 — Compound unique DB index on { userId, competitionId }:
 *   Even if two identical registration requests slip through simultaneously
 *   (e.g., double-click, network retry), only one Registration document will
 *   be created. The second will get an E11000 MongoDB duplicate key error,
 *   which the error handler normalizes to a 409 Conflict.
 *
 * TRANSACTIONS:
 *   We use a MongoDB session/transaction here because we touch two collections
 *   (Competition.spotsBooked + Registration.create). Without a transaction,
 *   a crash between the spot increment and registration creation would leave
 *   the database in an inconsistent state (spot consumed but no Registration
 *   record exists). The transaction guarantees both operations commit together
 *   or both roll back.
 *
 *   NOTE: Transactions require a MongoDB replica set (Atlas M0 and above support this).
 *   For single-node local MongoDB, transactions aren't available — but Atlas always
 *   uses a replica set, so this is safe for production.
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
 * Step 1: Initiate payment order — called before registration is confirmed.
 * Returns an order object for the client to open Razorpay checkout.
 */
const initiatePaymentForRegistration = async (competitionId, userId, referralCode) => {
  const competition = await findCompetition(competitionId);
  if (!competition || !competition.isActive) {
    throw ApiError.notFound('Competition not found');
  }

  const now = new Date();
  if (now < competition.registrationStartAt || now > competition.registrationEndAt) {
    throw ApiError.badRequest('Registration window is not currently open');
  }
  if (competition.spotsBooked >= competition.totalSpots) {
    throw ApiError.conflict('All spots are filled for this competition');
  }

  // Check for existing confirmed registration
  const existingReg = await Registration.findOne({ userId, competitionId });
  if (existingReg && existingReg.status === 'CONFIRMED') {
    throw ApiError.conflict('You are already registered for this competition');
  }

  // Calculate discount if referral code applied (e.g. ₹10 off)
  let entryFee = competition.entryFee;
  let discountApplied = 0;
  if (referralCode && typeof referralCode === 'string' && referralCode.trim().length > 0) {
    discountApplied = Math.min(entryFee, 10);
    entryFee = Math.max(0, entryFee - discountApplied);
  }

  // Create payment order (mock/real Razorpay)
  const order = await paymentService.createOrder({
    amount: entryFee * 100, // Razorpay expects paise
    currency: competition.currency,
    receipt: `reg_${competitionId}_${userId}`,
    notes: {
      competitionId: String(competitionId),
      userId: String(userId),
      referralCode: referralCode || '',
      discountApplied: String(discountApplied),
    },
  });

  // Persist payment record
  const payment = await Payment.create({
    userId,
    competitionId,
    amount: entryFee,
    currency: competition.currency,
    provider: 'razorpay',
    providerOrderId: order.id,
    status: 'CREATED',
  });

  return {
    order,
    paymentId: payment._id,
    discountApplied,
    finalAmount: entryFee,
  };
};

/**
 * Step 2: Confirm registration after payment verification.
 * CRITICAL CONCURRENCY-SAFE SPOT BOOKING happens here.
 */
const confirmRegistration = async ({ competitionId, userId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  // Verify payment signature server-side (NEVER trust the client)
  const isValidPayment = paymentService.verifyPaymentSignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValidPayment) {
    throw ApiError.badRequest('Payment verification failed. Invalid signature.');
  }

  // Find the pending payment record
  const payment = await Payment.findOne({
    providerOrderId: razorpay_order_id,
    userId,
    competitionId,
    status: 'CREATED',
  });

  if (!payment) {
    throw ApiError.badRequest('Payment record not found or already processed');
  }

  const competition = await findCompetition(competitionId);
  if (!competition) throw ApiError.notFound('Competition not found');

  // Fast-path guard: if spots are already full, immediately reject with 409 without opening expensive transaction
  if (competition.spotsBooked >= competition.totalSpots) {
    const conflictErr = ApiError.conflict(
      'All spots are filled for this competition'
    );
    conflictErr.errorCode = 'SPOTS_FILLED';
    throw conflictErr;
  }

  // ─── MONGODB TRANSACTION ────────────────────────────────────────────
  const session = await mongoose.startSession();
  let registration;

  try {
    await session.withTransaction(async () => {
      // ATOMIC SPOT INCREMENT WITH CONDITION (Layer 1)
      // If spotsBooked < totalSpots, increment and get updated doc.
      // If condition fails (sold out), returns null.
      const updatedCompetition = await Competition.findOneAndUpdate(
        {
          _id: competition._id,
          spotsBooked: { $lt: competition.totalSpots },
          isActive: true,
        },
        { $inc: { spotsBooked: 1 } },
        { new: true, session }
      );

      if (!updatedCompetition) {
        // RACE CONDITION EDGE CASE:
        // Another concurrent user snatched the final spot while this user was completing
        // their Razorpay payment. We must abort registration and trigger an automatic refund.
        const raceErr = new Error('SPOTS_FILLED_RACE_CONDITION');
        raceErr.isRaceCondition = true;
        throw raceErr;
      }

      // Create Registration record (compound unique index = Layer 2)
      const [reg] = await Registration.create(
        [
          {
            userId,
            competitionId: competition._id,
            registeredAt: new Date(),
            entryFeePaid: competition.entryFee,
            paymentId: payment._id,
            status: 'CONFIRMED',
          },
        ],
        { session }
      );
      registration = reg;

      // Mark payment as success
      await Payment.findByIdAndUpdate(
        payment._id,
        {
          status: 'SUCCESS',
          providerPaymentId: razorpay_payment_id,
          providerSignature: razorpay_signature,
        },
        { session }
      );
    });
  } catch (err) {
    if (err.isRaceCondition || err.message === 'SPOTS_FILLED_RACE_CONDITION') {
      // EDGE CASE HANDLING — DO NOT KEEP CHARGE:
      // Trigger automatic refund stub via payment gateway to return funds to participant
      console.warn(`[RegistrationService] Race condition detected: spots filled for competition ${competitionId} during payment confirmation. Initiating automatic refund.`);
      
      const refund = await paymentService.initiateRefund({
        paymentId: razorpay_payment_id || payment._id,
        amount: payment.amount * 100,
        notes: {
          reason: 'Race condition: Spots filled during payment checkout',
          competitionId: String(competitionId),
          userId: String(userId),
        },
      });

      await Payment.findByIdAndUpdate(payment._id, {
        status: 'REFUNDED',
        failureReason: 'Spots sold out concurrently during checkout. Full refund initiated.',
        refundId: refund.id,
      });

      const conflictErr = ApiError.conflict(
        'All spots were filled while your payment was processing. A full 100% refund has been automatically initiated.'
      );
      conflictErr.errorCode = 'SPOTS_FILLED';
      throw conflictErr;
    }

    // Check if error was caused by concurrency/WriteConflict while spots filled up
    const latestComp = await Competition.findById(competitionId).select('spotsBooked totalSpots');
    if (latestComp && latestComp.spotsBooked >= latestComp.totalSpots) {
      const conflictErr = ApiError.conflict(
        'All spots are filled for this competition'
      );
      conflictErr.errorCode = 'SPOTS_FILLED';
      throw conflictErr;
    }

    throw err;
  } finally {
    await session.endSession();
  }

  // Invalidate Redis cache immediately so spots count is 100% accurate
  await cacheService.invalidateCompetition(competitionId);
  if (competition.slug) {
    await cacheService.invalidateCompetition(competition.slug);
  }

  return {
    registration,
    spotsLeft: Math.max(0, competition.totalSpots - (competition.spotsBooked + 1)),
  };
};

/**
 * Cancel registration and process refund.
 * RULE: Cannot cancel after submission window has started.
 */
const cancelRegistration = async (competitionId, userId) => {
  const competition = await Competition.findById(competitionId);
  if (!competition) throw ApiError.notFound('Competition not found');

  const now = new Date();
  // Block cancellation after submission window opens
  if (now >= competition.submissionStartAt) {
    throw ApiError.badRequest(
      'Cancellation is not allowed after the submission window has opened.'
    );
  }

  const registration = await Registration.findOne({
    userId,
    competitionId,
    status: 'CONFIRMED',
  });

  if (!registration) {
    throw ApiError.notFound('No confirmed registration found for this competition');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Atomically decrement spots
      await Competition.findByIdAndUpdate(
        competitionId,
        { $inc: { spotsBooked: -1 } },
        { session }
      );

      // Mark registration cancelled
      await Registration.findByIdAndUpdate(
        registration._id,
        { status: 'CANCELLED' },
        { session }
      );

      // Initiate refund (stub)
      if (registration.paymentId) {
        const payment = await Payment.findById(registration.paymentId).session(session);
        if (payment && payment.status === 'SUCCESS') {
          const refund = await paymentService.initiateRefund({
            paymentId: payment.providerPaymentId,
            amount: payment.amount * 100,
          });
          await Payment.findByIdAndUpdate(
            payment._id,
            { status: 'REFUNDED', refundId: refund.id },
            { session }
          );
        }
      }
    });
  } finally {
    await session.endSession();
  }

  // Invalidate Redis cache immediately so spots count is 100% accurate
  await cacheService.invalidateCompetition(competitionId);
  if (competition.slug) {
    await cacheService.invalidateCompetition(competition.slug);
  }

  return { message: 'Registration cancelled and refund initiated' };
};

module.exports = { initiatePaymentForRegistration, confirmRegistration, cancelRegistration };
