import { config } from "dotenv";

import bcrypt from "bcryptjs";

config({ path: ".env.local" });
config();

const ADMIN_TAX_ID = "999999999";
const ADMIN_PASSWORD = "admin123";
const ADMIN_ROLE = "super_admin";

type UserRow = {
  id: number;
};

async function seed() {
  try {
    const { default: pool } = await import("./db");

    console.log("🌱 Seeding admin user...");

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT false
    `);

    // hash password
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // check if admin exists
    const result = await pool.query<UserRow>(
      "SELECT id FROM users WHERE tax_id = $1",
      [ADMIN_TAX_ID]
    );

    if (result.rows.length === 0) {

      // create admin
      await pool.query(
        `
        INSERT INTO users (tax_id, password, role, created_at, full_access)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          ADMIN_TAX_ID,
          hash,
          ADMIN_ROLE,
          new Date().toISOString(),
          true,
        ]
      );

      console.log("✅ Admin user created");

    } else {

      // reset password if admin exists
      await pool.query(
        `
        UPDATE users
        SET password = $1, role = $2, full_access = $3
        WHERE tax_id = $4
        `,
        [
          hash,
          ADMIN_ROLE,
          true,
          ADMIN_TAX_ID,
        ]
      );

      console.log("🔄 Admin password updated");

    }

    console.log("🎉 Seed completed successfully");

    process.exit(0);

  } catch (error) {

    console.error("❌ Seed error:", error);

    process.exit(1);

  }
}

seed();
