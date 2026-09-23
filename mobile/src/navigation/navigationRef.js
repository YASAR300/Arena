import { createNavigationContainerRef } from '@react-navigation/native';
import { ROUTES } from './routes';

/**
 * Global navigation ref for API interceptors and deep links
 */
export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to Login screen preserving returnTo destination
 */
export function navigateToLoginWithReturn(returnToScreen, returnParams = {}) {
  if (navigationRef.isReady()) {
    const currentRoute = navigationRef.getCurrentRoute();
    const destination = returnToScreen || currentRoute?.name || ROUTES.COMPETITION_DETAILS;
    const params = returnParams || currentRoute?.params || {};

    navigationRef.navigate(ROUTES.LOGIN, {
      returnTo: destination,
      returnParams: params,
    });
  }
}

export default navigationRef;
