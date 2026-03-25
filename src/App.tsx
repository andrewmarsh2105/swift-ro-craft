import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ROProvider } from "@/contexts/ROContext";
import { FlagProvider } from "@/contexts/FlagContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SUPABASE_CONFIGURED } from "@/integrations/supabase/client";

import Index from "./pages/Index";
import Landing from "./pages/Landing";
import { Loader2, AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "@/components/states/ErrorBoundary";

// Lazy-loaded heavy routes
const AddRO = lazy(() => import("./pages/AddRO"));
const FlagInboxPage = lazy(() => import("./pages/FlagInboxPage"));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Support = lazy(() => import("./pages/Support"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <Index /> : <Landing />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  // If Supabase env vars were absent at build time the client module would
  // previously throw here, killing React before mount.  We now guard at the
  // React level so a clear, actionable error screen is shown instead of an
  // infinite spinner or a blank page.
  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <h1 className="text-lg font-semibold mb-1">App configuration error</h1>
            <p className="text-muted-foreground text-sm">
              Supabase environment variables are missing. The app cannot authenticate or load data.
              Check that <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> are set.
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            If you are the site owner, set these variables in your hosting platform's environment
            settings (Netlify → Site settings → Environment variables, Vercel → Project settings →
            Environment variables), then redeploy.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm cursor-pointer border-0"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
  // Outer ErrorBoundary catches crashes in any Provider (AuthProvider,
  // SubscriptionProvider, OfflineProvider, ROProvider, FlagProvider).
  // Previously, the only ErrorBoundary was inside BrowserRouter which means
  // provider-level errors produced a blank white screen.
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
        <OfflineProvider>
        <ROProvider>
          <FlagProvider>
            <TooltipProvider>
              <Sonner />

              <BrowserRouter>
                {/* Inner boundary catches router/route-level errors without
                    requiring a full page reload for non-critical failures. */}
                <ErrorBoundary>
                <Suspense fallback={<LazyFallback />}>
                  <Routes>
                    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/add-ro" element={<ProtectedRoute><AddRO /></ProtectedRoute>} />
                    <Route path="/flag-inbox" element={<ProtectedRoute><FlagInboxPage /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </FlagProvider>
        </ROProvider>
        </OfflineProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
