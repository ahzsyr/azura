-- Postgres full-text search on SearchDocument (materialized tsvector + GIN index)
ALTER TABLE "SearchDocument" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

UPDATE "SearchDocument"
SET "search_vector" =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(body, '')), 'B')
WHERE "search_vector" IS NULL;

CREATE INDEX IF NOT EXISTS "SearchDocument_search_vector_idx"
  ON "SearchDocument" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION search_document_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS search_document_search_vector_trigger ON "SearchDocument";
CREATE TRIGGER search_document_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, body ON "SearchDocument"
  FOR EACH ROW
  EXECUTE FUNCTION search_document_search_vector_update();

CREATE INDEX IF NOT EXISTS "SearchDocument_metadata_facets_gin_idx"
  ON "SearchDocument" USING GIN ((metadata->'facets'));

CREATE INDEX IF NOT EXISTS "SearchDocument_metadata_kind_idx"
  ON "SearchDocument" ((metadata->>'kind'));

CREATE INDEX IF NOT EXISTS "SearchDocument_metadata_visibility_idx"
  ON "SearchDocument" ((metadata->>'visibility'));
