import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ---------------------------------------------------------------------------
// Supabase project: spqjhfipdvvlmtalkjaz  ← active project for this codebase
//
// These three constants MUST all reference the same Supabase project.
// If you change the project, update ALL THREE fallbacks AND supabase/config.toml
// in the same commit — a partial update can cause auth/data mismatches.
//
// The fallback values (anon/public keys) are safe to embed in client-side code.
// RLS policies on the server enforce all access control.
// ---------------------------------------------------------------------------
const FALLBACK_PROJECT_ID = 'spqjhfipdvvlmtalkjaz';
const FALLBACK_URL       = 'https://spqjhfipdvvlmtalkjaz.supabase.co';
const FALLBACK_KEY       = 'sb_publishable_fQ3pL-WCTrRSx4WHoRoK8A_3DHej6km';

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || FALLBACK_KEY;
const SUPABASE_PROJECT_ID =
  (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) || FALLBACK_PROJECT_ID;

// DO NOT throw here. A module-level throw prevents React from mounting at all,
// leaving the user on the pre-render loading screen forever with no recovery
// path. Log loudly and let the auth layer surface the error gracefully instead.
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Authentication will not work. Check your environment configuration.',
  );
}

/**
 * Export a flag so callers (App.tsx) can show a config-error UI instead of
 * silently failing on every auth / data call.
 */
export const SUPABASE_CONFIGURED = !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

function extractProjectRefFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const host = new URL(url).hostname;
    const [subdomain] = host.split('.');
    return subdomain || undefined;
  } catch {
    return undefined;
  }
}

// Catch misconfiguration early: URL/project-id/fallback should align to one
// project ref to avoid auth/data errors caused by mixed project settings.
const urlProjectRef = extractProjectRefFromUrl(SUPABASE_URL);
if (
  SUPABASE_CONFIGURED &&
  (
    (urlProjectRef && SUPABASE_PROJECT_ID && urlProjectRef !== SUPABASE_PROJECT_ID) ||
    (urlProjectRef && urlProjectRef !== FALLBACK_PROJECT_ID) ||
    (SUPABASE_PROJECT_ID && SUPABASE_PROJECT_ID !== FALLBACK_PROJECT_ID)
  )
) {
  console.warn(
    '[Supabase] Project mismatch detected. ' +
      `URL ref="${urlProjectRef ?? 'unparsed'}", ` +
      `VITE_SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID ?? 'unset'}", ` +
      `fallback ref="${FALLBACK_PROJECT_ID}". ` +
      'Align env vars and fallback config to the same project ref.',
  );
}

/**
 * Returns localStorage when it is actually accessible, otherwise undefined.
 *
 * Accessing `localStorage` throws a SecurityError in:
 *   - iOS private-browsing strict mode
 *   - Browsers with storage disabled in settings
 *   - Some privacy extensions / restrictive iframe sandboxes
 *
 * Passing `undefined` causes Supabase to fall back to in-memory storage so
 * the rest of the module loads without crashing. Sessions won't persist across
 * reloads in these environments, but the app will still render.
 */
function safeLocalStorage(): Storage | undefined {
  try {
    // A lightweight write/read test — some browsers expose the object but
    // throw only when you actually access keys.
    const probe = '__sb_storage_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    console.warn(
      '[Supabase] localStorage is unavailable. Auth sessions will not persist across reloads.',
    );
    return undefined;
  }
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Export the resolved URL so other modules (e.g. useScanFlow) can build
// edge-function URLs with the same fallback logic instead of reading
// import.meta.env.VITE_SUPABASE_URL directly (which is undefined in
// deployed builds that don't have the env var set, causing iOS Safari to
// throw "The string did not match the expected pattern" on fetch()).
export { SUPABASE_URL };

export const supabase = createClient<Database>(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY ?? 'placeholder-anon-key',
  {
    auth: {
      storage: safeLocalStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
