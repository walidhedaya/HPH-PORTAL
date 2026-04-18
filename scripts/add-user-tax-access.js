require("dotenv").config();

const { Pool } = require("pg");

// 🧠 Detect environment
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // 🔐 SSL only in production (Railway)
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

async function run() {
  try {
    console.log("🚀 Running migration...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_tax_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tax_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tax_access_user_id 
      ON user_tax_access(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tax_access_tax_id 
      ON user_tax_access(tax_id);
    `);

    console.log("✅ user_tax_access table ready");

    await pool.end();
    process.exit(0);

  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

run();