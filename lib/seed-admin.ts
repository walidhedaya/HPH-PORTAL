import db from "./db";
import bcrypt from "bcryptjs";

const ADMIN_TAX_ID = "999999999";
const ADMIN_PASSWORD = "admin123";

const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

const exists = db
  .prepare(`SELECT * FROM users WHERE tax_id = ?`)
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
  db.prepare(`
    UPDATE users
    SET password = ?, role = ?
    WHERE tax_id = ?
  `).run(hash, "admin", ADMIN_TAX_ID);

  console.log("🔄 Admin password reset");

  const updated = db
    .prepare(`SELECT * FROM users WHERE tax_id = ?`)
    .get(ADMIN_TAX_ID);

  console.log("Stored hash:", updated.password);
}

console.log("Test compare result:",
  bcrypt.compareSync("admin123", hash)
);