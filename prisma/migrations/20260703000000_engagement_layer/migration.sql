-- Redesign engagement layer: extend UserProgress with bookmarks, collections,
-- expeditions, streak and daily-loop bookkeeping (server mirror of the client
-- engagement store). Existing columns (xp, theoriesExplored,
-- connectionsDiscovered, achievements, rabbitHoleDepth) are reused.
ALTER TABLE "UserProgress"
  ADD COLUMN IF NOT EXISTS "bookmarks"      TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "proposals"      TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "collections"    JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "expeditions"    JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "streak"         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastActiveDay"  INTEGER,
  ADD COLUMN IF NOT EXISTS "questDay"       INTEGER,
  ADD COLUMN IF NOT EXISTS "mysteryDay"     INTEGER,
  ADD COLUMN IF NOT EXISTS "onboardingDone" BOOLEAN NOT NULL DEFAULT false;
