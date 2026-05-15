CREATE TABLE IF NOT EXISTS admin_actions_log (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER,
  bl_number TEXT,
  action_type TEXT,
  action_status TEXT,
  comment TEXT,
  admin_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_log_created_at
ON admin_actions_log(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_actions_log_bl_number
ON admin_actions_log(bl_number);
