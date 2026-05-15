ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS user_tax_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tax_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_tax_access_user_id
ON user_tax_access(user_id);

CREATE INDEX IF NOT EXISTS idx_user_tax_access_tax_id
ON user_tax_access(tax_id);
