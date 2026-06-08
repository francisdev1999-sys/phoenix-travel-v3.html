import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  env: {
    NEXT_PUBLIC_ADMIN_EMAIL:  process.env.ADMIN_EMAIL         ?? '',
    NEXT_PUBLIC_SENTRY_DSN:   process.env.SENTRY_DSN          ?? '',
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build-time options — all optional, safe to ship without a DSN
  org:     process.env.SENTRY_ORG     ?? '',
  project: process.env.SENTRY_PROJECT ?? '',
  // Don't fail the build if Sentry upload fails
  silent: true,
  // Automatically tree-shake Sentry debug code in production
  disableLogger: true,
  // Tunnel Sentry requests through our own domain to avoid ad-blockers
  tunnelRoute: '/monitoring',
  // Upload source maps in CI when SENTRY_AUTH_TOKEN is present
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Suppress "Sentry is not configured" warning when DSN is absent (dev/CI)
  sourcemaps: { disable: !process.env.SENTRY_DSN },
});
