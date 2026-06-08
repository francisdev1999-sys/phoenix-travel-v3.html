import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Trace 10% of requests in production to keep quota low
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Replay 1% of sessions normally, 100% on errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  // Ignore noisy browser-generated errors
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    /^Loading chunk \d+ failed/,
  ],
});
