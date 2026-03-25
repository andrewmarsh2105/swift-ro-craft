/**
 * src/components/states/ErrorBoundary.tsx
 *
 * App-wide safety net for unexpected runtime errors.
 */
import React from "react";
import { AlertTriangle, Copy, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";

type Props = { children: React.ReactNode };
type State = { error?: Error; info?: string };

/**
 * Nuclear-option reset: clears SW caches + Supabase auth tokens then reloads.
 * Mirrors the clearCachesAndReload() function in index.html's boot watchdog so
 * users always have an escape hatch when a plain reload would just re-crash.
 */
async function resetAndReload() {
  try { sessionStorage.removeItem('sw-reload-pending'); } catch { /* ignore */ }
  // Remove Supabase auth tokens so a corrupted/stale token doesn't re-trigger
  // the same crash on reload.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* ignore */ }

  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch { /* ignore */ }
  }

  window.location.reload();
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, info: info.componentStack ?? undefined });
    console.error("App crashed:", error, info);
  }

  private handleReload = () => window.location.reload();
  private handleReset = () => resetAndReload();

  private handleCopy = async () => {
    const { error, info } = this.state;
    const payload = [
      `Error: ${error?.message ?? "Unknown"}`,
      "",
      error?.stack ?? "",
      "",
      "Component stack:",
      info ?? "",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // ignore
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full">
          <EmptyState
            icon={AlertTriangle}
            title="Something went wrong"
            description={this.state.error.message || "An unexpected error occurred. Please reload the page."}
            actions={
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={this.handleReload}>
                    <RefreshCcw className="h-4 w-4 mr-1" />
                    Reload
                  </Button>
                  <Button variant="outline" size="sm" onClick={this.handleCopy}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy error
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  If reloading doesn't help, clear the app cache:
                </p>
                <Button variant="destructive" size="sm" onClick={this.handleReset}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear cache &amp; reset
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }
}
