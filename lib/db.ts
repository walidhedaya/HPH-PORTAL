import Database from "better-sqlite3";
import path from "path";

// Ensure database always created in project root
const dbPath = path.join(process.cwd(), "shipments.db");

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
// EXPORT SHIPMENTS TABLE (SEPARATE WORKFLOW)
// =====================
db.prepare(`
  CREATE TABLE IF NOT EXISTS export_shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_number TEXT,
    tax_id TEXT,
    terminal TEXT,
    service_type TEXT, -- ENTRY or EMPTY
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

// =====================
// SAFE MIGRATION FOR IMPORT TABLE
// =====================
const shipmentColumns = db
  .prepare(`PRAGMA table_info(shipments)`)
  .all()
  .map((c: any) => c.name);

function addShipmentColumnIfMissing(name: string, type: string) {
  if (!shipmentColumns.includes(name)) {
    db.prepare(`ALTER TABLE shipments ADD COLUMN ${name} ${type}`).run();
  }
}

addShipmentColumnIfMissing("admin_comment", "TEXT");
addShipmentColumnIfMissing("reviewed_at", "TEXT");
addShipmentColumnIfMissing("draft_invoice_filename", "TEXT");
addShipmentColumnIfMissing("draft_invoice_uploaded_at", "TEXT");
addShipmentColumnIfMissing("final_invoice_filename", "TEXT");
addShipmentColumnIfMissing("final_invoice_uploaded_at", "TEXT");
addShipmentColumnIfMissing("payment_proof_filename", "TEXT");
addShipmentColumnIfMissing("payment_uploaded_at", "TEXT");
addShipmentColumnIfMissing("gate_pass_filename", "TEXT");
addShipmentColumnIfMissing("gate_pass_uploaded_at", "TEXT");
addShipmentColumnIfMissing("handling_admin", "TEXT");

// =====================
// SAFE MIGRATION FOR EXPORT TABLE
// =====================
const exportColumns = db
  .prepare(`PRAGMA table_info(export_shipments)`)
  .all()
  .map((c: any) => c.name);

function addExportColumnIfMissing(name: string, type: string) {
  if (!exportColumns.includes(name)) {
    db.prepare(`ALTER TABLE export_shipments ADD COLUMN ${name} ${type}`).run();
  }
}

addExportColumnIfMissing("booking_number", "TEXT");
addExportColumnIfMissing("service_type", "TEXT");
addExportColumnIfMissing("stuffing", "INTEGER DEFAULT 0");
addExportColumnIfMissing("inspection", "INTEGER DEFAULT 0");
addExportColumnIfMissing("inspection_containers", "INTEGER DEFAULT 0");

addExportColumnIfMissing("export_docs_filename", "TEXT");
addExportColumnIfMissing("export_docs_uploaded_at", "TEXT");

addExportColumnIfMissing("draft_invoice_filename", "TEXT");
addExportColumnIfMissing("draft_invoice_uploaded_at", "TEXT");

addExportColumnIfMissing("payment_proof_filename", "TEXT");
addExportColumnIfMissing("payment_uploaded_at", "TEXT");

addExportColumnIfMissing("final_invoice_filename", "TEXT");
addExportColumnIfMissing("final_invoice_uploaded_at", "TEXT");

addExportColumnIfMissing("gate_pass_filename", "TEXT");
addExportColumnIfMissing("gate_pass_uploaded_at", "TEXT");

export default db;
