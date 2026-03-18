import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {

  const admin = verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {

    const { rows } = await db.query(`
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
    `);

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