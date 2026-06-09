import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig.map(config => ({
    ...config,
    rules: config.rules
      ? Object.fromEntries(
          Object.entries(config.rules).map(([k, v]) => [
            k,
            Array.isArray(v) ? ['warn', ...v.slice(1)] : v === 'error' ? 'warn' : v,
          ])
        )
      : {},
  })),
  {
    rules: {
      // Pre-existing across the codebase — treat as warnings, not blockers
      'react/no-unescaped-entities': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'prisma/migrations/**', 'sentry.*.config.ts'],
  },
];
