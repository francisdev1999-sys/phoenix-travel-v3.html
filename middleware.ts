import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control':    'on',
  'X-Frame-Options':           'DENY',
  'X-Content-Type-Options':    'nosniff',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

export default auth(function middleware(req: NextRequest & { auth: unknown }) {
  const { nextUrl } = req;
  const session = (req as unknown as { auth: { user?: { role?: string; email?: string | null } } | null }).auth;

  // ── Privileged panel routes — admin or owner ───────────────────────────────
  // The `admin` role has full control-panel access; owner-only protections
  // (e.g. cannot demote/ban an owner) are enforced inside the individual routes.
  if (nextUrl.pathname.startsWith('/api/super-admin')) {
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { role, email } = session.user;
    if (!['owner', 'admin'].includes(role ?? '') && email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // ── Admin routes — admin or owner ──────────────────────────────────────────
  if (nextUrl.pathname.startsWith('/api/admin')) {
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { role, email } = session.user;
    if (!['owner', 'admin'].includes(role ?? '') && email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // ── Cron routes — CRON_SECRET only (no user session) ──────────────────────
  if (nextUrl.pathname.startsWith('/api/cron')) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return withSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)',
  ],
};
