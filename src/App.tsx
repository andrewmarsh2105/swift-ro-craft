import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/states/ErrorBoundary";

// Lazy-loaded routes – public
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Support = lazy(() => import("./pages/Support"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy-loaded authenticated shell (contains providers + all app routes)
const AuthenticatedShell = lazy(() => import("./components/AuthenticatedShell"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LazyFallback />;

  if (user) {
    // Render the authenticated shell which lazy-loads Index + providers
    return <AuthenticatedShell />;
  }

  return <Landing />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LazyFallback />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LazyFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <AuthenticatedShell />;
}

const App = () => {
  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />

          <BrowserRouter>
            <ErrorBoundary>
            <Suspense fallback={<LazyFallback />}>
              <Routes>
                {/* Public routes – no app providers mounted */}
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/support" element={<Support />} />

                {/* Authenticated routes – providers mount inside AuthenticatedShell */}
                <Route path="/" element={<HomeRoute />} />
                <Route path="/add-ro" element={<ProtectedRoute />} />
                <Route path="/flag-inbox" element={<ProtectedRoute />} />
                <Route path="/admin" element={<ProtectedRoute />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
