import React from 'react';

/**
 * ErrorBoundary — converts a render-time crash (e.g. a transient bad data shape
 * during a reconnect or an in-memory server reset) into a recoverable fallback
 * instead of a white screen. The polling hooks recover on their own once the
 * backend is healthy again, so "Try again" simply re-mounts the tree; "Reload"
 * is the hard reset. Same cockpit design system as the rest of the app.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface for debugging; never rethrow — that's what white-screens the app.
    console.error('RailGuard UI error boundary caught:', error, info);
  }

  handleRetry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-4">
        <div className="panel max-w-md w-full p-6 text-center">
          <div className="flex items-baseline justify-center gap-2 mb-3">
            <span className="text-sm font-bold tracking-tight text-ink">RailGuard</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-crit">interrupted</span>
          </div>
          <p className="text-sm text-ink-2">The console hit an unexpected error.</p>
          <p className="text-[11px] text-ink-3 mt-1">
            This can happen briefly if the backend restarts or resets its in-memory data.
            The live feed reconnects on its own.
          </p>
          {this.state.error?.message && (
            <p className="mt-3 px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 font-mono text-[11px] text-crit break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={this.handleRetry} className="btn-accent px-4 py-2">
              Try again
            </button>
            <button onClick={() => window.location.reload()} className="btn-ghost px-4 py-2">
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
