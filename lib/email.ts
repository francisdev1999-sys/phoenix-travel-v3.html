/**
 * Email service — powered by Resend.
 *
 * Requires env vars:
 *   RESEND_API_KEY  — from resend.com dashboard
 *   EMAIL_FROM      — verified sender, e.g. "Nexus Archive <no-reply@nexusarchive.up.railway.app>"
 *
 * All functions are no-ops when RESEND_API_KEY is absent so the app runs
 * without email configured (dev, CI).
 */

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? 'Nexus Archive <no-reply@nexusarchive.up.railway.app>';

// ── Core send helper ──────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) return; // email not configured
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    // Never let email failure crash the API response
    console.error('[email] send failed', { to, subject, err });
  }
}

// ── Shared layout ─────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#000005;font-family:system-ui,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#0a0a1a;border:1px solid #1e1b4b;border-radius:12px;overflow:hidden">
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b,#0a0a1a);padding:28px 32px;border-bottom:1px solid #1e1b4b">
              <span style="font-size:18px;font-weight:700;color:#a78bfa;letter-spacing:0.05em">NEXUS ARCHIVE</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e1b4b;font-size:11px;color:#475569;text-align:center">
              This is an automated message from Nexus Archive. Do not reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Notification functions ────────────────────────────────────────────────────

export async function sendBanNotification(
  to:        string,
  name:      string,
  reason:    string,
  expiresAt: Date | null,
): Promise<void> {
  const expiry = expiresAt
    ? `<p style="color:#94a3b8;font-size:14px">Your ban will automatically lift on <strong style="color:#e2e8f0">${expiresAt.toUTCString()}</strong>.</p>`
    : `<p style="color:#94a3b8;font-size:14px">This ban is permanent. Contact support if you believe this is in error.</p>`;

  const body = `
    <h2 style="color:#f87171;font-size:20px;margin:0 0 16px">Your account has been suspended</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">Hello ${name},</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">
      Your Nexus Archive account has been banned for the following reason:
    </p>
    <div style="background:#1a0a0a;border:1px solid #7f1d1d;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#fca5a5;font-size:14px;margin:0">${reason}</p>
    </div>
    ${expiry}
  `;
  await send(to, 'Your Nexus Archive account has been suspended', layout('Account Suspended', body));
}

export async function sendSuspensionNotification(
  to:          string,
  name:        string,
  reason:      string,
  durationDays: number | null,
  expiresAt:   Date | null,
): Promise<void> {
  const durationText = durationDays
    ? `for ${durationDays} day${durationDays !== 1 ? 's' : ''}`
    : 'temporarily';

  const expiry = expiresAt
    ? `<p style="color:#94a3b8;font-size:14px">Your suspension will lift on <strong style="color:#e2e8f0">${expiresAt.toUTCString()}</strong>.</p>`
    : '';

  const body = `
    <h2 style="color:#fb923c;font-size:20px;margin:0 0 16px">Your account has been suspended ${durationText}</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">Hello ${name},</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">
      Your Nexus Archive account has been suspended ${durationText} for the following reason:
    </p>
    <div style="background:#1a0f00;border:1px solid #92400e;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#fdba74;font-size:14px;margin:0">${reason}</p>
    </div>
    ${expiry}
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">
      Please review our community guidelines before your account is restored.
    </p>
  `;
  await send(to, `Your Nexus Archive account has been suspended`, layout('Account Suspended', body));
}

export async function sendUnbanNotification(
  to:   string,
  name: string,
): Promise<void> {
  const body = `
    <h2 style="color:#4ade80;font-size:20px;margin:0 0 16px">Your account has been restored</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">Hello ${name},</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">
      Your Nexus Archive account has been reviewed and your access has been restored.
      You can now sign in and resume contributing.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">
      Please continue to follow our community guidelines to keep your standing.
    </p>
  `;
  await send(to, 'Your Nexus Archive account has been restored', layout('Account Restored', body));
}

export async function sendTrustWarning(
  to:         string,
  name:       string,
  trustScore: number,
): Promise<void> {
  const body = `
    <h2 style="color:#facc15;font-size:20px;margin:0 0 16px">Trust score alert</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">Hello ${name},</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">
      Your Nexus Archive trust score has dropped to <strong style="color:#fbbf24">${trustScore}/100</strong>.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">
      Continued low trust may result in submission restrictions. You can rebuild your score by
      submitting accurate, well-sourced contributions that are approved by reviewers.
    </p>
  `;
  await send(to, 'Your Nexus Archive trust score is low', layout('Trust Score Alert', body));
}
