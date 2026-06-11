-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_node_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.region, '') || ' ' ||
    coalesce(NEW.country, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'node_search_vector_update'
  ) THEN
    CREATE TRIGGER node_search_vector_update
    BEFORE INSERT OR UPDATE OF title, description, region, country
    ON "Node"
    FOR EACH ROW EXECUTE FUNCTION update_node_search_vector();
  END IF;
END $$;
