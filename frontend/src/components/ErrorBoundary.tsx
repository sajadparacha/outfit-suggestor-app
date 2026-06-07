import React from 'react';

type ErrorBoundaryProps = {
  /** Optional label shown in the fallback UI */
  label?: string;
  /** Change this value to reset the boundary */
  resetKey?: string | number;
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log for debugging; in production you could send this to a logging service.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', this.props.label ?? 'Error', error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, errorInfo: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.label ?? 'This section';

    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur">
        <h2 className="text-2xl font-bold text-white mb-2">{label} hit an error</h2>
        <p className="text-slate-300 mb-6">
          Something went wrong while rendering this page. Try reloading, or go back and try again.
        </p>

        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-left mb-6">
          <p className="text-sm font-semibold text-red-200 mb-1">Error</p>
          <pre className="text-xs text-red-100 whitespace-pre-wrap break-words">{error.message}</pre>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-brand rounded-xl px-6 py-3 font-semibold"
          >
            Reload page
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }
}

