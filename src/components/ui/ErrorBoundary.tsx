import React from 'react';

interface Props {
  children: React.ReactNode;
  resetKey?: string;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Page crashed:', error);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">Something went wrong</h2>
        <p className="text-sm text-slate-500">This page ran into a problem. Your data is safe.</p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Try again
          </button>
          <a href="/" className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl">
            Go home
          </a>
        </div>
      </div>
    );
  }
}
