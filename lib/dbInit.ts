import db from "@/lib/db";

let initialized = false;
let userAccessInitialized = false;

export async function ensurePaymentColumn() {
  if (initialized) return;

  try {
    await db.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS payment_link TEXT
    `);

    await db.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS payment_link_set_at TIMESTAMPTZ
    `);

    initialized = true;
    console.log("Column created ✅");
  } catch (err: any) {
    // لو العمود موجود ignore
    if (!err.message.includes("duplicate")) {
      console.error(err);
    }
  }
}

export async function ensureUserAccessSchema() {
  if (userAccessInitialized) return;

  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT false
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_tax_access (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      tax_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_tax_access_user_id
    ON user_tax_access(user_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_tax_access_tax_id
    ON user_tax_access(tax_id)
  `);

  userAccessInitialized = true;
}
