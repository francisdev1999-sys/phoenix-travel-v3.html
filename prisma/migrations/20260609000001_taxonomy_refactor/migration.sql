-- ─────────────────────────────────────────────────────────────────────────────
-- Taxonomy Refactor Migration
-- Nexus Archive — 2026-06-09
--
-- Safe to run multiple times (idempotent WHERE clause updates).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add sourceTrustExplanation to Source
ALTER TABLE "Source" ADD COLUMN IF NOT EXISTS "sourceTrustExplanation" TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Migrate ProposedNode.category  (old 9-category set → new 27-category set)
-- ─────────────────────────────────────────────────────────────────────────────

-- Official old categories from lib/validation/enums.ts
UPDATE "ProposedNode" SET category = 'Ancient Civilization'    WHERE category = 'Ancient Civilizations';
UPDATE "ProposedNode" SET category = 'Ancient Site'            WHERE category = 'Egypt & Ancient Engineering';
UPDATE "ProposedNode" SET category = 'Religion'                WHERE category = 'Religious Texts & Mythology';
-- 'UFO / UAP' is unchanged — no UPDATE needed
UPDATE "ProposedNode" SET category = 'Forbidden Archaeology'   WHERE category = 'Human Origins';
UPDATE "ProposedNode" SET category = 'Unexplained Phenomenon'  WHERE category = 'Consciousness & Reality';
UPDATE "ProposedNode" SET category = 'Esoterica'               WHERE category = 'Secret Societies & Esoteric';
UPDATE "ProposedNode" SET category = 'Modern Mystery'          WHERE category = 'Global Mysteries';
UPDATE "ProposedNode" SET category = 'Mythology'               WHERE category = 'Legends & Folklore';

-- Unofficial ProposeNodeForm categories that were shipped to production
UPDATE "ProposedNode" SET category = 'Ancient Technology'      WHERE category = 'Lost Technology';
UPDATE "ProposedNode" SET category = 'Unexplained Phenomenon'  WHERE category = 'Cosmic Events';
UPDATE "ProposedNode" SET category = 'Alternative History'     WHERE category = 'Hidden History';
UPDATE "ProposedNode" SET category = 'Symbolism'               WHERE category = 'Sacred Geometry';
UPDATE "ProposedNode" SET category = 'Unexplained Phenomenon'  WHERE category = 'Consciousness';
UPDATE "ProposedNode" SET category = 'Extraterrestrial Hypothesis' WHERE category = 'Interdimensional';
UPDATE "ProposedNode" SET category = 'Religion'                WHERE category = 'Prophecy';

-- Catch-all: any remaining unrecognised category → Modern Mystery
UPDATE "ProposedNode"
SET category = 'Modern Mystery'
WHERE category NOT IN (
  'Ancient Civilization','Ancient Site','Artifact','Lost Knowledge','Ancient Technology',
  'Forbidden Archaeology','Alternative History',
  'Religion','Mythology','Ancient Text',
  'UFO / UAP','Extraterrestrial Hypothesis',
  'Government Program','Government Secrecy','Intelligence Operation','Secret Project',
  'Conspiracy Theory','Historical Controversy','Whistleblower',
  'Disease & Pandemic','Unexplained Phenomenon',
  'Symbolism','Esoterica',
  'Historical Figure','Organization','Technology','Modern Mystery'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Migrate Category.name  (live Node categories)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE "Category" SET name = 'Ancient Civilization'    WHERE name = 'Ancient Civilizations';
UPDATE "Category" SET name = 'Ancient Site'            WHERE name = 'Egypt & Ancient Engineering';
UPDATE "Category" SET name = 'Religion'                WHERE name = 'Religious Texts & Mythology';
UPDATE "Category" SET name = 'Forbidden Archaeology'   WHERE name = 'Human Origins';
UPDATE "Category" SET name = 'Unexplained Phenomenon'  WHERE name = 'Consciousness & Reality';
UPDATE "Category" SET name = 'Esoterica'               WHERE name = 'Secret Societies & Esoteric';
UPDATE "Category" SET name = 'Modern Mystery'          WHERE name = 'Global Mysteries';
UPDATE "Category" SET name = 'Mythology'               WHERE name = 'Legends & Folklore';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Migrate Source.sourceType  (only one old type has no new equivalent)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE "Source" SET "sourceType" = 'Historical Text' WHERE "sourceType" = 'Folklore Collection';

-- Catch-all: any remaining unrecognised source type → 'Other'
UPDATE "Source"
SET "sourceType" = 'Other'
WHERE "sourceType" NOT IN (
  'Academic Paper','Archaeological Report',
  'Government Document','Declassified Document','FOIA Release','Court Record',
  'Museum Archive','Historical Text','Religious Text',
  'Book','News Investigation','Research Report','Scientific Dataset',
  'Interview','Witness Testimony','Photograph','Video Evidence','Website','Other'
);
