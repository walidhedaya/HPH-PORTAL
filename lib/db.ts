import Database from "better-sqlite3";
import path from "path";

// Ensure database always created in project root
const dbPath = path.resolve(process.cwd(), "shipments.db");

console.log("📦 Using database at:", dbPath);

// Create connection
const db = new Database(dbPath);

// =====================
// USERS TABLE
// =====================
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tax_id TEXT UNIQUE,
    password TEXT,
    role TEXT,
    created_at TEXT
  )
`).run();

// SAFE MIGRATION USERS
const userColumns = db
  .prepare(`PRAGMA table_info(users)`)
  .all()
  .map((c: any) => c.name);

function addUserColumnIfMissing(name: string, type: string) {
  if (!userColumns.includes(name)) {
    db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${type}`).run();
  }
}

addUserColumnIfMissing("password", "TEXT");
addUserColumnIfMissing("role", "TEXT");
addUserColumnIfMissing("created_at", "TEXT");

// =====================
// IMPORT SHIPMENTS TABLE
// =====================
db.prepare(`
  CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bl_number TEXT,
    tax_id TEXT,
    terminal TEXT,
    consignee TEXT,
    status TEXT,
    created_at TEXT,

    pdf_filename TEXT,
    pdf_uploaded_at TEXT,
    pdf_status TEXT,

    admin_comment TEXT,
    reviewed_at TEXT,

    draft_invoice_filename TEXT,
    draft_invoice_uploaded_at TEXT,

    final_invoice_filename TEXT,
    final_invoice_uploaded_at TEXT,

    payment_proof_filename TEXT,
    payment_uploaded_at TEXT,

    gate_pass_filename TEXT,
    gate_pass_uploaded_at TEXT,

    handling_admin TEXT
  )
`).run();

// =====================
// EXPORT SHIPMENTS TABLE
// =====================
db.prepare(`
  CREATE TABLE IF NOT EXISTS export_shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_number TEXT,
    tax_id TEXT,
    terminal TEXT,
    service_type TEXT,
    created_at TEXT,

    stuffing INTEGER DEFAULT 0,
    inspection INTEGER DEFAULT 0,
    inspection_containers INTEGER DEFAULT 0,

    export_docs_filename TEXT,
    export_docs_uploaded_at TEXT,

    draft_invoice_filename TEXT,
    draft_invoice_uploaded_at TEXT,

    payment_proof_filename TEXT,
    payment_uploaded_at TEXT,

    final_invoice_filename TEXT,
    final_invoice_uploaded_at TEXT,

    gate_pass_filename TEXT,
    gate_pass_uploaded_at TEXT
  )
`).run();

export default db;