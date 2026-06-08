-- Tier: Auth — add role column to User for future role-based access control
-- Valid values: owner | admin | reviewer | contributor | user

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';

-- Back-fill: leave all existing users as 'user'.
-- The owner email is set server-side on next sign-in via the auth signIn callback.

CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
