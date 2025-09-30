-- Add provenance metadata columns to ingestion_events
ALTER TABLE ingestion_events
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS metrics JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Backfill dedupe_key for existing rows
UPDATE ingestion_events
SET dedupe_key = CONCAT_WS(':', source, scope, to_char(COALESCE(started_at, NOW()), 'YYYYMMDDHH24MISSMS'))
WHERE dedupe_key IS NULL;

-- Backfill updated_at for existing rows
UPDATE ingestion_events
SET updated_at = COALESCE(updated_at, NOW())
WHERE updated_at IS NULL;

-- Ensure retry_count default is 0 for existing rows
UPDATE ingestion_events
SET retry_count = COALESCE(retry_count, 0)
WHERE retry_count IS NULL;

-- Enforce NOT NULL constraints after backfill
ALTER TABLE ingestion_events
  ALTER COLUMN dedupe_key SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN retry_count SET NOT NULL;

-- Create unique constraint on dedupe_key for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON i.indexrelid = c.oid
    WHERE c.relname = 'ingestion_events_dedupe_idx'
  ) THEN
    CREATE UNIQUE INDEX ingestion_events_dedupe_idx ON ingestion_events (dedupe_key);
  END IF;
END
$$;
