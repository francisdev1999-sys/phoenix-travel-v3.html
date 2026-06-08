'use client';
import { SessionProvider } from 'next-auth/react';
import { Component, ReactNode } from 'react';

class AuthBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return this.props.children;
    return this.props.children;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthBoundary>
      <SessionProvider>{children}</SessionProvider>
    </AuthBoundary>
  );
}
