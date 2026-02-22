import { NextResponse } from "next/server";
import db from "@/lib/db";
import * as XLSX from "xlsx";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    const now = new Date().toISOString();

    for (const row of rows) {
      if (!row.bl_number || !row.tax_id || !row.terminal) continue;

      await db.query(
        `
        INSERT INTO shipments
        (bl_number, tax_id, terminal, consignee, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          String(row.bl_number).trim(),
          String(row.tax_id).trim(),
          String(row.terminal).trim(),
          row.consignee ? String(row.consignee).trim() : "",
          row.status ? String(row.status).trim() : "Open",
          now,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("UPLOAD BL ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}