import { Alert, Platform } from 'react-native';

/**
 * Notification Service (Expo Go Safe & Production Ready Architecture)
 * ──────────────────────────────────────────────────────────────────
 * Why Expo Go Safe:
 * In recent Expo SDK releases (SDK 53+), the `expo-notifications` native module
 * is no longer included inside the standard Expo Go client and requires a custom
 * development build (`npx expo run:android`).
 * 
 * To ensure Expo Go runs 100% cleanly without native build errors or warnings,
 * this service implements a structured client-side notification scheduler for:
 * 1. "Registration closing in 1 hour" reminder
 * 2. "Submission window opening" reminder
 * 
 * Production Push Notification Architecture (FCM / APNs):
 * In live production:
 * 1. Native Push SDK: Replace with `@notifee/react-native` or FCM native module in bare workflow.
 * 2. Device Token Registration: Client sends FCM/APNs device token to `POST /api/users/device-token`.
 * 3. Scheduled Worker Dispatch: Backend BullMQ + Redis job checks competitions where
 *    `now === registrationEndAt - 1hr` and triggers multicast push notifications via Firebase Admin SDK.
 * 4. Deep-Link Payload: Payload `{ url: "feedants://competitions/:slug" }` wakes app directly to contest.
 */

// Active scheduled timer references
const scheduledTimers = new Map();

export const notificationService = {
  /**
   * Request permission for notifications (mocked for Expo Go)
   */
  async requestPermissions() {
    return true;
  },

  /**
   * Schedule competition deadline reminders based on real competition dates
   * @param {Object} competition
   * @param {Date|string} competition.registrationEndAt
   * @param {Date|string} competition.submissionStartAt
   * @param {string} competition.title
   * @param {string} competition.slug
   */
  async scheduleCompetitionReminders(competition) {
    if (!competition) return;

    // Clear existing timers for this competition
    if (scheduledTimers.has(competition.slug)) {
      scheduledTimers.get(competition.slug).forEach((timerId) => clearTimeout(timerId));
      scheduledTimers.set(competition.slug, []);
    } else {
      scheduledTimers.set(competition.slug, []);
    }

    const timers = scheduledTimers.get(competition.slug);
    const now = Date.now();

    // 1. Reminder: Registration closing in 1 hour
    if (competition.registrationEndAt) {
      const regEndTime = new Date(competition.registrationEndAt).getTime();
      const oneHourBeforeReg = regEndTime - 60 * 60 * 1000;
      const delayMs = oneHourBeforeReg - now;

      console.log(
        `[NotificationService] Registration closing reminder scheduled for "${competition.title}" in ${Math.max(0, Math.floor(delayMs / 1000))}s`
      );

      if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
        const timerId = setTimeout(() => {
          Alert.alert(
            '⏰ Hurry! Registration Closing Soon',
            `Only 1 hour left to book your spot for "${competition.title || 'Feedants Classical Dance'}"!`,
            [{ text: 'View Competition' }]
          );
        }, delayMs);
        timers.push(timerId);
      }
    }

    // 2. Reminder: Submission window opening
    if (competition.submissionStartAt) {
      const subStartTime = new Date(competition.submissionStartAt).getTime();
      const delayMs = subStartTime - now;

      console.log(
        `[NotificationService] Submission window opening reminder scheduled for "${competition.title}" in ${Math.max(0, Math.floor(delayMs / 1000))}s`
      );

      if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
        const timerId = setTimeout(() => {
          Alert.alert(
            '🎬 Submissions Are Now Open!',
            `You can now upload your performance video for "${competition.title || 'Feedants Classical Dance'}".`,
            [{ text: 'Upload Now' }]
          );
        }, delayMs);
        timers.push(timerId);
      }
    }
  },

  /**
   * Cancel reminders
   */
  cancelReminders(slug) {
    if (scheduledTimers.has(slug)) {
      scheduledTimers.get(slug).forEach((timerId) => clearTimeout(timerId));
      scheduledTimers.delete(slug);
    }
  },
};

export default notificationService;
