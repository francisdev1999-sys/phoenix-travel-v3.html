'use client';
import { SessionProvider } from 'next-auth/react';
import { Component, ReactNode } from 'react';

// Renders children directly (without SessionProvider) if auth throws.
// This prevents an infinite re-render loop when the auth endpoint is misconfigured.
class AuthBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthBoundary fallback={children}>
      <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
      >
        {children}
      </SessionProvider>
    </AuthBoundary>
  );
}
