/**
 * Competition Lifecycle Status Job
 *
 * Runs every minute to:
 * 1. Find competitions whose status is stale (e.g., still REGISTRATION_OPEN but
 *    registrationEndAt has passed)
 * 2. Recalculate and persist their correct status
 * 3. Emit Socket.IO `competition:statusChanged` events so connected mobile clients
 *    can react immediately (refresh screen, update CTA button)
 * 4. Stub: notify service placeholder (SMS, push, email) per lifecycle transition
 *
 * WHY a cron job AND computed status:
 * - `calculateDerivedStatus()` on the model gives the accurate CURRENT state on-the-fly
 *   for API responses (always accurate, no delay).
 * - The cron job writes the persisted `status` field to the DB so you can query
 *   competitions efficiently by status (e.g. "all open competitions") using an indexed
 *   field rather than comparing dates in every query.
 */

const cron = require('node-cron');
const { Competition } = require('../models');

// ── Stub Notification Service ──────────────────────────────────────────────
// In production, replace console.log with:
// - Firebase Cloud Messaging (FCM) push notifications
// - SendGrid / AWS SES email
// - Twilio SMS
const notificationService = {
  async notifyStatusChange(competition, oldStatus, newStatus) {
    console.log(
      `[Notifications] STUB: Competition "${competition.title}" transitioned ` +
      `${oldStatus} → ${newStatus}. ` +
      `Would notify ${competition.spotsBooked} registered participants.`
    );
    // TODO: Plug in real push/email/SMS service here
  },
};

const LIFECYCLE_TRANSITIONS = [
  { fromStatus: 'UPCOMING', toStatus: 'REGISTRATION_OPEN' },
  { fromStatus: 'REGISTRATION_OPEN', toStatus: 'REGISTRATION_CLOSED' },
  { fromStatus: 'REGISTRATION_CLOSED', toStatus: 'SUBMISSION_OPEN' },
  { fromStatus: 'SUBMISSION_OPEN', toStatus: 'SUBMISSION_CLOSED' },
  { fromStatus: 'SUBMISSION_CLOSED', toStatus: 'RESULTS_DECLARED' },
];

let ioInstance = null;

const startLifecycleJob = (io) => {
  ioInstance = io;

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const activeCompetitions = await Competition.find({
        isActive: true,
        status: { $nin: ['DRAFT', 'CANCELLED', 'RESULTS_DECLARED'] },
      });

      for (const competition of activeCompetitions) {
        const derivedStatus = competition.calculateDerivedStatus();

        if (derivedStatus !== competition.status) {
          const oldStatus = competition.status;
          competition.status = derivedStatus;
          await competition.save();

          console.log(
            `[LifecycleJob] "${competition.title}" status updated: ${oldStatus} → ${derivedStatus}`
          );

          // Emit real-time status change to all clients watching this competition
          if (ioInstance) {
            ioInstance.to(`competition:${competition._id}`).emit('competition:statusChanged', {
              competitionId: competition._id,
              oldStatus,
              newStatus: derivedStatus,
            });
          }

          // Trigger notification stub
          await notificationService.notifyStatusChange(competition, oldStatus, derivedStatus);
        }
      }
    } catch (err) {
      console.error('[LifecycleJob] Error during lifecycle check:', err.message);
    }
  });

  console.log('[LifecycleJob] Competition lifecycle status job started (runs every minute)');
};

module.exports = { startLifecycleJob };
