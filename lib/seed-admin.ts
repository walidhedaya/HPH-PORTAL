import "dotenv/config"; // load .env variables

import pool from "./db";
import bcrypt from "bcryptjs";

const ADMIN_TAX_ID = "999999999";
const ADMIN_PASSWORD = "admin123";

type UserRow = {
  id: number;
};

async function seed() {
  try {

    console.log("🌱 Seeding admin user...");

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

      console.log("✅ Admin user created");

    } else {

      // reset password if admin exists
      await pool.query(
        `
        UPDATE users
        SET password = $1, role = $2
        WHERE tax_id = $3
        `,
        [
          hash,
          "admin",
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