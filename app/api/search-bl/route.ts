import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const bl = searchParams.get("bl");
    const taxId = searchParams.get("tax_id");
    const terminal = searchParams.get("terminal");

    // ===============================
    // ADMIN SEARCH (no terminal required)
    // ===============================
    if (bl && !terminal) {
      const { rows } = await db.query(
        `
        SELECT * FROM shipments
        WHERE LOWER(bl_number) = LOWER($1)
        `,
        [bl]
      );

      if (rows.length === 0) {
        return NextResponse.json({ success: false });
      }

      return NextResponse.json({
        success: true,
        data: rows[0],
      });
    }

    // ===============================
    // USER SEARCH (requires terminal)
    // ===============================
    if (!terminal || (!bl && !taxId)) {
      return NextResponse.json({ success: false });
    }

    let rows;

    // Search by BL
    if (bl) {
      const result = await db.query(
        `
        SELECT * FROM shipments
        WHERE LOWER(terminal) = LOWER($1)
        AND LOWER(bl_number) = LOWER($2)
        `,
        [terminal, bl]
      );
      rows = result.rows;
    }

    // Search by Tax ID
    else if (taxId) {
      const result = await db.query(
        `
        SELECT * FROM shipments
        WHERE LOWER(terminal) = LOWER($1)
        AND LOWER(tax_id) = LOWER($2)
        `,
        [terminal, taxId]
      );
      rows = result.rows;
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("SEARCH BL ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}