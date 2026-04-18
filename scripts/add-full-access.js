require("dotenv").config();

const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

async function run() {
  try {
    console.log("Running migration...");

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT false;
    `);

    console.log("✅ full_access column ready");

    process.exit(0);

  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

run();