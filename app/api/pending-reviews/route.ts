import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const rows = db.prepare(`
      SELECT
        bl_number,
        tax_id,
        terminal,
        pdf_filename,
        pdf_uploaded_at,
        pdf_status
      FROM shipments
      WHERE pdf_status = 'UNDER REVIEW'
      ORDER BY pdf_uploaded_at DESC
    `).all();

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Pending reviews error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
