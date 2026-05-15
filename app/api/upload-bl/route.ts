import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";
import * as XLSX from "xlsx";
import { verifyAdmin } from "@/lib/adminGuard";
import { validateCsrfOrigin } from "@/lib/csrfGuard";

export async function POST(req: NextRequest) {

  // ===============================
  // 🔐 ADMIN SECURITY
  // ===============================
  const admin = await verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  try {

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // ===============================
    // 🔐 FILE VALIDATION
    // ===============================
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Only .xlsx files allowed" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const isXlsxZip =
      buffer.length > 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b;

    if (!isXlsxZip) {
      return NextResponse.json(
        { error: "Invalid XLSX file" },
        { status: 400 }
      );
    }

    let rows: any[];

    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<any>(sheet);
    } catch {
      return NextResponse.json(
        { error: "Invalid XLSX file" },
        { status: 400 }
      );
    }

    if (!rows.length) {
      return NextResponse.json(
        { error: "Empty file" },
        { status: 400 }
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: "Too many rows (max 5000)" },
        { status: 400 }
      );
    }

    const now = new Date();

    // ===============================
    // 🔐 SANITIZE + PREPARE DATA
    // ===============================
    const values: any[] = [];
    const placeholders: string[] = [];
    let index = 1;

    for (const row of rows) {

      if (!row.bl_number || !row.tax_id || !row.terminal) continue;

      const bl = String(row.bl_number).trim().toUpperCase();
      const tax = String(row.tax_id).trim();
      const terminal = String(row.terminal).trim();
      const consignee = row.consignee
        ? String(row.consignee).trim()
        : "";

      const status = row.status
        ? String(row.status).trim()
        : "Open";

      // 🔐 length limits (prevent abuse)
      if (bl.length > 50 || tax.length > 50 || terminal.length > 50) continue;

      placeholders.push(
        `($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`
      );

      values.push(
        bl,
        tax,
        terminal,
        consignee,
        status,
        now
      );
    }

    if (!values.length) {
      return NextResponse.json(
        { error: "No valid rows found" },
        { status: 400 }
      );
    }

    // ===============================
    // 🔥 TRANSACTION + BULK INSERT
    // ===============================
    await db.query("BEGIN");

    await db.query(
      `
      INSERT INTO shipments
      (bl_number, tax_id, terminal, consignee, status, created_at)
      VALUES ${placeholders.join(",")}
      `,
      values
    );

    await db.query("COMMIT");

    return NextResponse.json({
      success: true,
      inserted: values.length / 6,
    });

  } catch (err: any) {

    await db.query("ROLLBACK");

    console.error("UPLOAD BL ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
