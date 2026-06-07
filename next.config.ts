import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  env: {
    // Expose admin email to the client for nav/UI rendering only.
    // All admin API routes re-verify server-side via ADMIN_EMAIL.
    NEXT_PUBLIC_ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? '',
  },
};

export default nextConfig;
