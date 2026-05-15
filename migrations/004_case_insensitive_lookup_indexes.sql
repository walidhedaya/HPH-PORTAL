CREATE INDEX IF NOT EXISTS idx_shipments_lower_bl_number
ON shipments (LOWER(bl_number));

CREATE INDEX IF NOT EXISTS idx_shipments_lower_tax_id
ON shipments (LOWER(tax_id));

CREATE INDEX IF NOT EXISTS idx_shipments_lower_terminal_bl_created
ON shipments (LOWER(terminal), LOWER(bl_number), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shipments_lower_terminal_tax_created
ON shipments (LOWER(terminal), LOWER(tax_id), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_shipments_lower_booking_number
ON export_shipments (LOWER(booking_number));

CREATE INDEX IF NOT EXISTS idx_export_shipments_lower_tax_id
ON export_shipments (LOWER(tax_id));

CREATE INDEX IF NOT EXISTS idx_users_lower_tax_id
ON users (LOWER(tax_id));

CREATE INDEX IF NOT EXISTS idx_user_tax_access_lower_tax_id
ON user_tax_access (LOWER(tax_id));

CREATE INDEX IF NOT EXISTS idx_user_tax_access_user_id_lower_tax_id
ON user_tax_access (user_id, LOWER(tax_id));
