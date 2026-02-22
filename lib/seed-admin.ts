import "dotenv/config";   // 👈 VERY IMPORTANT
import pool from "./db";
import bcrypt from "bcryptjs";

const ADMIN_TAX_ID = "999999999";
const ADMIN_PASSWORD = "admin123";

async function seed() {
  try {
    console.log("🌱 Seeding admin...");

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const result = await pool.query(
      "SELECT id FROM users WHERE tax_id = $1",
      [ADMIN_TAX_ID]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `
        INSERT INTO users (tax_id, password, role, created_at)
        VALUES ($1, $2, $3, $4)
        `,
        [
          ADMIN_TAX_ID,
          hash,
          "admin",
          new Date().toISOString(),
        ]
      );

      console.log("✅ Admin created");
    } else {
      await pool.query(
        `
        UPDATE users
        SET password = $1, role = $2
        WHERE tax_id = $3
        `,
        [hash, "admin", ADMIN_TAX_ID]
      );

      console.log("🔄 Admin password reset");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();