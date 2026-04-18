import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ROProvider } from "@/contexts/ROContext";
import { FlagProvider } from "@/contexts/FlagContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { PanelErrorBoundary } from "@/components/states/PanelErrorBoundary";
import { Loader2 } from "lucide-react";
import { AccessGate } from "@/components/access/AccessGate";

const Index = lazy(() => import("@/pages/Index"));
const AddRO = lazy(() => import("@/pages/AddRO"));
const FlagInboxPage = lazy(() => import("@/pages/FlagInboxPage"));
const Admin = lazy(() => import("@/pages/Admin"));

function ShellFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Authenticated app shell – mounts heavy providers (RO, Flag, Offline,
 * Subscription) only when a user is logged in. This keeps the public
 * marketing pages lightweight.
 *
 * This component is rendered by the parent router at `/`, `/add-ro`,
 * `/flag-inbox`, and `/admin`. It uses a nested `<Routes>` to pick the
 * correct page based on the current URL.
 */
export default function AuthenticatedShell() {
  return (
    <SubscriptionProvider>
      <AccessGate>
        <OfflineProvider>
          <ROProvider>
            <FlagProvider>
              <PanelErrorBoundary label="App">
                <Suspense fallback={<ShellFallback />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/add-ro" element={<AddRO />} />
                    <Route path="/flag-inbox" element={<FlagInboxPage />} />
                    <Route path="/admin" element={<Admin />} />
                  </Routes>
                </Suspense>
              </PanelErrorBoundary>
            </FlagProvider>
          </ROProvider>
        </OfflineProvider>
      </AccessGate>
    </SubscriptionProvider>
  );
}
