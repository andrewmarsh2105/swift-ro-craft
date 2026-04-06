import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  /** Label shown in the error fallback, e.g. "Summary" */
  label?: string;
}

interface State {
  error?: Error;
}

/**
 * Lightweight error boundary for wrapping individual tabs/panels.
 * Shows a compact inline error instead of crashing the whole app.
 */
export class PanelErrorBoundary extends React.Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[PanelErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info);
  }

  private handleRetry = () => this.setState({ error: undefined });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive/60" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={this.handleRetry}>
          <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }
}
