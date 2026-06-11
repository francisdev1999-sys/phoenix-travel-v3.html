-- Phase E1: Galaxy System
-- Adds Galaxy model and galaxyId to Category.
-- Safe to re-run (IF NOT EXISTS, idempotent column add).

CREATE TABLE IF NOT EXISTS "Galaxy" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "slug"        TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "icon"        TEXT,
  "color"       TEXT,
  "order"       INTEGER     NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Galaxy_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Galaxy_slug_key') THEN
    ALTER TABLE "Galaxy" ADD CONSTRAINT "Galaxy_slug_key" UNIQUE ("slug");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Galaxy_slug_idx"  ON "Galaxy"("slug");
CREATE INDEX IF NOT EXISTS "Galaxy_order_idx" ON "Galaxy"("order");

-- Add galaxyId to Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "galaxyId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_galaxyId_fkey') THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_galaxyId_fkey"
      FOREIGN KEY ("galaxyId") REFERENCES "Galaxy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Category_galaxyId_idx" ON "Category"("galaxyId");
