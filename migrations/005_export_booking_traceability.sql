ALTER TABLE export_shipments
ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;

ALTER TABLE export_shipments
ADD COLUMN IF NOT EXISTS created_by_username TEXT;

ALTER TABLE export_shipments
ADD COLUMN IF NOT EXISTS created_ip TEXT;

ALTER TABLE export_shipments
ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_export_shipments_created_by_user_id
ON export_shipments(created_by_user_id);
