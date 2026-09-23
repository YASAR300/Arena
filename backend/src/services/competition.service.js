const mongoose = require('mongoose');
const { Competition, Registration, Submission, PreviousWinner } = require('../models');

/**
 * Compute the server-side CTA state for the current user on a competition.
 *
 * WHY server-side:
 * The client must never decide which CTA to show — they can be manipulated.
 * State depends on: server clock vs date windows, user's registration record,
 * user's submission record, and spots availability.
 */
const computeUserCompetitionState = async (competition, userId) => {
  const now = new Date(); // used for lifecycle date comparisons via calculateDerivedStatus()
  void now; // suppress unused-vars — lifecycle computation happens inside Competition model
  const lifecycleStatus = competition.calculateDerivedStatus();
  const isSoldOut = competition.spotsBooked >= competition.totalSpots;

  // Base state for unauthenticated users
  if (!userId) {
    return {
      isRegistered: false,
      registrationStatus: null,
      hasSubmitted: false,
      submissionStatus: null,
      competitionLifecycleStatus: lifecycleStatus,
      canRegister: lifecycleStatus === 'REGISTRATION_OPEN' && !isSoldOut,
      canSubmit: false,
      ctaLabel: lifecycleStatus === 'REGISTRATION_OPEN' ? 'Register Now' : getLifecycleCTA(lifecycleStatus),
      ctaAction: 'LOGIN_REQUIRED',
    };
  }

  // Fetch registration and submission in parallel
  const [registration, submission] = await Promise.all([
    Registration.findOne({ userId, competitionId: competition._id }),
    Submission.findOne({ userId, competitionId: competition._id }),
  ]);

  const isRegistered = !!registration && registration.status === 'CONFIRMED';
  const hasSubmitted = !!submission;

  const canRegister =
    lifecycleStatus === 'REGISTRATION_OPEN' && !isRegistered && !isSoldOut;

  const canSubmit =
    lifecycleStatus === 'SUBMISSION_OPEN' && isRegistered && !hasSubmitted;

  // CTA label state machine
  let ctaLabel;
  let ctaAction;

  if (lifecycleStatus === 'RESULTS_DECLARED') {
    ctaLabel = 'Results Announced';
    ctaAction = 'VIEW_RESULTS';
  } else if (lifecycleStatus === 'SUBMISSION_OPEN' && isRegistered && hasSubmitted) {
    ctaLabel = 'Submission Uploaded';
    ctaAction = 'VIEW_SUBMISSION';
  } else if (lifecycleStatus === 'SUBMISSION_OPEN' && isRegistered && !hasSubmitted) {
    ctaLabel = 'Upload Submission';
    ctaAction = 'UPLOAD_SUBMISSION';
  } else if (isRegistered) {
    ctaLabel = 'Registered';
    ctaAction = 'REGISTERED';
  } else if (canRegister) {
    ctaLabel = 'Register Now';
    ctaAction = 'REGISTER';
  } else {
    ctaLabel = getLifecycleCTA(lifecycleStatus);
    ctaAction = 'NONE';
  }

  return {
    isRegistered,
    registrationStatus: registration ? registration.status : null,
    hasSubmitted,
    submissionStatus: submission ? submission.status : null,
    competitionLifecycleStatus: lifecycleStatus,
    canRegister,
    canSubmit,
    ctaLabel,
    ctaAction,
  };
};

const getLifecycleCTA = (status) => {
  switch (status) {
    case 'UPCOMING': return 'Coming Soon';
    case 'REGISTRATION_CLOSED': return 'Registration Closed';
    case 'SUBMISSION_OPEN': return 'Submit Entry';
    case 'SUBMISSION_CLOSED': return 'Judging in Progress';
    case 'RESULTS_DECLARED': return 'Results Announced';
    case 'CANCELLED': return 'Cancelled';
    default: return 'Register Now';
  }
};

const cacheService = require('./cache.service');

/**
 * Get full competition details by id or slug with populated judge and previous winners.
 * Implements Cache-Aside pattern with Redis for ultra-high read concurrency.
 */
const getCompetitionDetails = async (idOrSlug, userId) => {
  const cacheKey = `competition:details:${idOrSlug}`;
  let baseData = await cacheService.get(cacheKey);

  let competitionDoc;
  if (!baseData) {
    let query;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      query = { _id: idOrSlug, isActive: true };
    } else {
      query = { slug: idOrSlug, isActive: true };
    }

    const competition = await Competition.findOne(query).populate('judge').lean({ virtuals: true });
    if (!competition) return null;

    // Fetch bounded previous winners (using index on seriesId + rank)
    const seriesId = competition.slug;
    const previousWinners = await PreviousWinner.find({ seriesId })
      .sort({ rank: 1 })
      .limit(10)
      .lean();

    baseData = {
      ...competition,
      spotsLeft: Math.max(0, competition.totalSpots - competition.spotsBooked),
      isSoldOut: competition.spotsBooked >= competition.totalSpots,
      previousWinners,
    };

    // Cache shared competition data in Redis (TTL: 3 minutes)
    await cacheService.set(cacheKey, baseData, 180);
    if (baseData.slug && baseData.slug !== idOrSlug) {
      await cacheService.set(`competition:details:${baseData.slug}`, baseData, 180);
    }
  }

  // Compute personalized user state (or anonymous state if no userId)
  competitionDoc = await Competition.findById(baseData._id);
  const currentUserState = competitionDoc
    ? await computeUserCompetitionState(competitionDoc, userId)
    : { canRegister: false, ctaAction: 'LOGIN_REQUIRED' };

  return {
    ...baseData,
    currentUserState,
  };
};

/**
 * Get lightweight spots data for polling (Cached with 30s TTL)
 */
const getCompetitionSpots = async (competitionId) => {
  const cacheKey = `competition:spots:${competitionId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const competition = await Competition.findById(competitionId)
    .select('totalSpots spotsBooked registrationEndAt')
    .lean();
  if (!competition) return null;

  const spots = {
    totalSpots: competition.totalSpots,
    spotsBooked: competition.spotsBooked,
    spotsLeft: Math.max(0, competition.totalSpots - competition.spotsBooked),
    registrationEndAt: competition.registrationEndAt,
  };

  await cacheService.set(cacheKey, spots, 30);
  return spots;
};

module.exports = { getCompetitionDetails, getCompetitionSpots, computeUserCompetitionState };
