import db from "./db";
import bcrypt from "bcryptjs";

const ADMIN_TAX_ID = "999999999";
const ADMIN_PASSWORD = "admin123";

const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

const exists = db
  .prepare(`SELECT id FROM users WHERE tax_id = ?`)
  .get(ADMIN_TAX_ID);

if (!exists) {
  db.prepare(`
    INSERT INTO users (tax_id, password, role, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    ADMIN_TAX_ID,
    hash,
    "admin",
    new Date().toISOString()
  );

  console.log("✅ Admin created");
} else {
  console.log("ℹ️ Admin already exists");
}
