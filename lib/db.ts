import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function init() {
  try {
    console.log("🔄 Initializing database...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        tax_id TEXT UNIQUE,
        password TEXT,
        role TEXT,
        created_at TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
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
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS export_shipments (
        id SERIAL PRIMARY KEY,
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
      );
    `);

    console.log("✅ Database tables ready");
  } catch (error) {
    console.error("❌ DB INIT ERROR:", error);
  }
}

init();

export default pool;