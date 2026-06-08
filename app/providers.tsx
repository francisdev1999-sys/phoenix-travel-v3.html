'use client';
import { SessionProvider } from 'next-auth/react';
import { Component, ReactNode } from 'react';

class AuthBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.props.children; }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthBoundary>
      <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
      >
        {children}
      </SessionProvider>
    </AuthBoundary>
  );
}
