-- Switch embedding provider from OpenAI text-embedding-3-small (1536 dims)
-- to Voyage AI voyage-3 (1024 dims).
-- Existing embeddings are incompatible — clear them so they are regenerated.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'NodeEmbedding' AND column_name = 'embedding'
  ) THEN
    DELETE FROM "NodeEmbedding";
    BEGIN
      EXECUTE 'ALTER TABLE "NodeEmbedding" ALTER COLUMN "embedding" TYPE vector(1024) USING NULL::vector(1024)';
    EXCEPTION WHEN others THEN
      -- pgvector not installed or column not a vector type — leave as float8[]
      NULL;
    END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SourceEmbedding' AND column_name = 'embedding'
  ) THEN
    DELETE FROM "SourceEmbedding";
    BEGIN
      EXECUTE 'ALTER TABLE "SourceEmbedding" ALTER COLUMN "embedding" TYPE vector(1024) USING NULL::vector(1024)';
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;
