import { ROUTES } from './routes';

/**
 * Deep Linking Configuration for Feedants Arena
 * 
 * Supports:
 * - Custom URL Scheme: feedants://competitions/:slug?ref=CODE
 * - Universal/App Links: https://feedants.com/competitions/:slug?ref=CODE
 * - Fallback / Dev: https://*.feedants.com, exp://...
 * 
 * NOTE ON WEB FALLBACK (Assignment Documentation):
 * In a production deployment, if a user opens `https://feedants.com/competitions/:slug?ref=CODE`
 * in their mobile browser without the Feedants app installed:
 * 1. Apple App Site Association (AASA) / Android Digital Asset Links (assetlinks.json)
 *    route the click directly to the app if installed.
 * 2. If the app is not installed, the HTTPS URL falls back to a web landing page.
 *    That landing page displays the competition summary, prompts the user to install the app
 *    via the App Store / Play Store, and uses deferred deep linking (via Branch.io or Firebase Dynamic Links)
 *    to preserve the referral code `ref=CODE` through the installation process.
 */
export const linking = {
  prefixes: [
    'feedants://',
    'https://feedants.com',
    'https://*.feedants.com',
    'https://arena-wog5.onrender.com',
  ],
  config: {
    screens: {
      [ROUTES.COMPETITION_DETAILS]: {
        path: 'competitions/:slug',
        parse: {
          slug: (slug) => slug || 'feedants-classical-dance',
          ref: (ref) => ref || '',
        },
      },
      [ROUTES.SUBMISSION_UPLOAD]: {
        path: 'competitions/:slug/submit',
      },
      [ROUTES.LOGIN]: 'login',
      [ROUTES.SIGNUP]: 'signup',
      [ROUTES.HOME]: 'home',
    },
  },
};

export default linking;
