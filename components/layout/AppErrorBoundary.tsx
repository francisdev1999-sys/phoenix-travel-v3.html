'use client';
import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; }

export default class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppShell] Unhandled error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#000005] text-slate-200 flex items-center justify-center">
          <div className="text-center space-y-6 p-8 max-w-md">
            <div className="text-5xl text-purple-400">⚠</div>
            <h1 className="text-xl font-bold text-white">Something went wrong</h1>
            <p className="text-sm text-slate-400">
              The archive encountered an unexpected error. Your progress is safe.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
            >
              Reload Archive
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
