import type { NavigateFunction } from 'react-router-dom';

/**
 * Navigate back if browser history exists, otherwise fall back to a safe route.
 * Prevents blank screens on direct-entry, refresh, or standalone page opens.
 */
export function goBackOrFallback(navigate: NavigateFunction, fallback = '/') {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate(fallback, { replace: true });
  }
}
