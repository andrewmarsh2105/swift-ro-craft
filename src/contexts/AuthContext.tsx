import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Maximum time we'll wait for Supabase to confirm the auth state before we
// default to "not signed in" and let the app render.  Without this, a network
// timeout or hung getSession() call leaves loading=true forever and the user
// sees a permanent spinner (effectively a blank screen).
const AUTH_TIMEOUT_MS = 8_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const intentionalSignOut = useRef(false);
  // Track whether loading has already been resolved so the timeout doesn't
  // race with a successful auth response.
  const resolved = useRef(false);

  useEffect(() => {
    // Short-circuit immediately when Supabase is not configured. Any API calls
    // would fail against placeholder.supabase.co (DNS error) and we'd waste the
    // full AUTH_TIMEOUT_MS before loading clears. The config-error UI in App.tsx
    // handles the user-visible explanation.
    if (!SUPABASE_CONFIGURED) {
      resolved.current = true;
      setLoading(false);
      return;
    }

    // Safety timeout: if neither onAuthStateChange nor getSession resolve
    // within AUTH_TIMEOUT_MS, default to logged-out so the UI renders.
    const timeoutId = setTimeout(() => {
      if (!resolved.current) {
        console.warn(
          `[Auth] Auth state did not resolve within ${AUTH_TIMEOUT_MS}ms. ` +
          'Defaulting to logged-out. Check Supabase connectivity.'
        );
        resolved.current = true;
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!resolved.current) {
        resolved.current = true;
        setLoading(false);
      }

      if (event === 'SIGNED_OUT' && !intentionalSignOut.current) {
        toast.error('Your session expired. Please sign in again.');
      }
      // Reset the flag after processing
      intentionalSignOut.current = false;
    });

    // getSession() returns the persisted session immediately from storage;
    // it can reject if localStorage is inaccessible or the stored token is
    // corrupted.  We must handle both cases so loading never hangs.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (!resolved.current) {
          resolved.current = true;
          setLoading(false);
        }
      })
      .catch((err) => {
        // getSession() failed (e.g. corrupted token, network error on token
        // refresh, or storage unavailable).  Treat as logged-out so the app
        // renders instead of hanging on the loading spinner.
        console.warn('[Auth] getSession() failed:', err?.message ?? err);
        if (!resolved.current) {
          resolved.current = true;
          setLoading(false);
        }
      });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    intentionalSignOut.current = true;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
