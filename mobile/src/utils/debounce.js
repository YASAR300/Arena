import { useRef, useCallback } from 'react';

/**
 * Debounce function utility (trailing edge)
 */
export function debounce(func, wait = 500) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle / Leading-edge click guard hook
 * Prevents rapid double-taps on critical buttons (e.g. Register, Pay, Submit)
 * Executes immediately on first tap, then blocks additional taps for `delayMs`.
 * 
 * DEFENSE-IN-DEPTH NOTE:
 * Even though the backend enforces atomic database operations and unique constraints,
 * client-side button throttling prevents unnecessary network spam and race condition requests.
 */
export function useThrottledCallback(callback, delayMs = 1000) {
  const lastCallRef = useRef(0);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delayMs) {
        lastCallRef.current = now;
        return callback(...args);
      }
    },
    [callback, delayMs]
  );
}

export default { debounce, useThrottledCallback };
