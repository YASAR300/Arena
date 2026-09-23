import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notification Service
 * 
 * LOCAL NOTIFICATIONS & PRODUCTION ARCHITECTURE NOTE:
 * ──────────────────────────────────────────────────
 * Why Local Notifications:
 * For this client-side demo, we schedule local notifications for time-sensitive
 * competition events (1 hour before registration closes, and when submission opens).
 * 
 * Production Push Notification Architecture (FCM / APNs):
 * In a live production environment with thousands of participants:
 * 1. Device Token Registration:
 *    On app launch / login, client calls `Notifications.getDevicePushTokenAsync()`.
 *    The push token is sent to backend `POST /api/users/device-token` and stored
 *    in the User model alongside device platform (iOS/Android).
 * 2. Scheduled Cron Dispatcher:
 *    A backend worker (BullMQ + Redis or AWS EventBridge) polls for upcoming deadlines
 *    (e.g., competitions where `registrationEndAt` is within 60 minutes).
 * 3. Batch Push Delivery:
 *    Backend uses Firebase Admin SDK (FCM) or Apple Push Notification Service (APNs HTTP/2)
 *    to send multicast push notifications to all users registered or tracking the contest.
 * 4. Deep-Link Payload:
 *    Push payloads include `{ url: "feedants://competitions/feedants-classical-dance" }`
 *    so tapping the notification opens directly to the relevant competition screen.
 */

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  /**
   * Request permission for notifications
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (err) {
      console.warn('[NotificationService] Permission request error:', err);
      return false;
    }
  },

  /**
   * Schedule competition deadline reminders
   * @param {Object} competition
   * @param {Date|string} competition.registrationEndAt
   * @param {Date|string} competition.submissionStartAt
   * @param {string} competition.title
   * @param {string} competition.slug
   */
  async scheduleCompetitionReminders(competition) {
    if (!competition) return;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      const now = Date.now();

      // 1. Reminder: Registration closing in 1 hour
      if (competition.registrationEndAt) {
        const regEndTime = new Date(competition.registrationEndAt).getTime();
        const oneHourBeforeReg = regEndTime - 60 * 60 * 1000;
        const triggerSec = Math.floor((oneHourBeforeReg - now) / 1000);

        if (triggerSec > 10) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Hurry! Registration Closing Soon`,
              body: `Only 1 hour left to book your spot for "${competition.title || 'Competition'}"!`,
              data: { slug: competition.slug, type: 'REGISTRATION_CLOSING' },
              sound: true,
            },
            trigger: { seconds: triggerSec },
          });
          console.log(`[NotificationService] Scheduled registration closing reminder in ${triggerSec}s`);
        }
      }

      // 2. Reminder: Submission window opening
      if (competition.submissionStartAt) {
        const subStartTime = new Date(competition.submissionStartAt).getTime();
        const triggerSubSec = Math.floor((subStartTime - now) / 1000);

        if (triggerSubSec > 10) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🎬 Submissions Are Now Open!`,
              body: `You can now upload your performance video for "${competition.title || 'Competition'}".`,
              data: { slug: competition.slug, type: 'SUBMISSION_OPENED' },
              sound: true,
            },
            trigger: { seconds: triggerSubSec },
          });
          console.log(`[NotificationService] Scheduled submission open reminder in ${triggerSubSec}s`);
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Error scheduling notifications:', err);
    }
  },
};

export default notificationService;
