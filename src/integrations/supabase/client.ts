import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

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
