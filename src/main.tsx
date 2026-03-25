import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/states/ErrorBoundary";

// ---------------------------------------------------------------------------
// Service-worker reload guard
// ---------------------------------------------------------------------------
// When a new SW takes control after a deploy, reload so lazy chunks resolve
// against new asset hashes instead of stale ones.  Limit to one auto-reload
// per SW activation cycle using sessionStorage (persists across reloads but
// not across new tabs).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('sw-reload-pending')) return;
    sessionStorage.setItem('sw-reload-pending', '1');
    window.location.reload();
  });
}

// Recover from dynamic-import failures that happen when a deploy invalidates
// old chunk hashes.  One reload is enough; the new SW will serve fresh assets.
// NOTE: we only skip the reload if the flag was set in this same session AND
// the page has already been alive for > 5 s (i.e. we already reloaded once
// and something else is wrong — avoid an infinite loop).
const SW_FLAG_KEY = 'sw-reload-pending';
window.addEventListener('unhandledrejection', (event) => {
  const msg = (event?.reason as Error | undefined)?.message ?? '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS for')
  ) {
    // If we already reloaded once this session AND it has been > 10 s since
    // page load, don't loop — let the app render its error state instead.
    const alreadyReloaded = sessionStorage.getItem(SW_FLAG_KEY);
    const pageAge = performance.now();
    if (alreadyReloaded && pageAge > 10_000) return;

    sessionStorage.setItem(SW_FLAG_KEY, '1');
    window.location.reload();
  }
});

// Clear the reload guard 12 s after a successful load so future SW updates
// can still trigger a recovery reload on subsequent visits.
window.addEventListener('load', () => {
  setTimeout(() => {
    sessionStorage.removeItem(SW_FLAG_KEY);
  }, 12_000);
}, { once: true });

// ---------------------------------------------------------------------------
// Theme — apply before first render to prevent flash
// ---------------------------------------------------------------------------
try {
  const savedTheme = localStorage.getItem('ro-tracker-theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Apply fixed blue accent before first render to prevent flash
  const isDark = savedTheme === 'dark';
  const blueHsl = isDark ? '214 90% 65%' : '214 95% 53%';
  document.documentElement.style.setProperty('--primary', blueHsl);
  document.documentElement.style.setProperty('--ring', blueHsl);
} catch {
  // localStorage may throw in private-browsing / storage-disabled environments.
  // Safe to ignore — the app will use its default theme.
  console.warn('[startup] localStorage unavailable; using default theme.');
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
const rootElement = document.getElementById('root');
if (!rootElement) {
  // This should never happen in production, but guard against it to avoid a
  // completely blank screen with no explanation.
  document.body.style.cssText =
    'min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#111;';
  document.body.innerHTML =
    '<div style="text-align:center;padding:2rem">' +
    '<h1 style="font-size:1.25rem;margin-bottom:.5rem">Unable to start the app</h1>' +
    '<p style="color:#666;margin-bottom:1rem">The page root element is missing. Try a hard refresh (Ctrl+Shift+R).</p>' +
    '<button onclick="window.location.reload()" style="padding:.5rem 1rem;border-radius:.375rem;background:#2B82F0;color:#fff;border:none;cursor:pointer">Reload</button>' +
    '</div>';
} else {
  // Signal the index.html boot watchdog that React is about to mount.
  // This prevents the watchdog from showing the error fallback UI in cases
  // where module loading succeeds but render takes longer than the timeout.
  // Must be called BEFORE createRoot().render() so the watchdog sees it even
  // if render itself throws (which would be caught by ErrorBoundary below).
  (window as { __signalBootOk?: () => void }).__signalBootOk?.();

  // Wrap the entire React tree in an ErrorBoundary so that any uncaught
  // exception thrown during provider initialization (outside the inner
  // BrowserRouter-scoped boundary) still shows a friendly error screen
  // instead of a blank white page.
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
