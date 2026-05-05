import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {

  const admin = await verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {

    // 🔥 only latest row per BL
    const { rows } = await db.query(`
      SELECT DISTINCT ON (LOWER(bl_number))
        id,
        bl_number,
        tax_id,
        terminal,
        pdf_filename,
        pdf_uploaded_at,
        pdf_status
      FROM shipments
      WHERE pdf_status = 'UNDER REVIEW'
      ORDER BY LOWER(bl_number), created_at DESC
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
