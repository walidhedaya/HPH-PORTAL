import { Pool } from "pg";

function shouldUseSsl() {
  const databaseUrl = process.env.DATABASE_URL || "";

  if (databaseUrl.includes("sslmode=require")) return true;
  if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")) {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
});

export default pool;
