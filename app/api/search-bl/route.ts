import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const bl = searchParams.get("bl");
  const taxId = searchParams.get("tax_id");
  const terminal = searchParams.get("terminal");

  // ===============================
  // ADMIN SEARCH (no terminal required)
  // ===============================
  if (bl && !terminal) {
    const row = db
      .prepare(`
        SELECT * FROM shipments 
        WHERE LOWER(bl_number) = LOWER(?)
      `)
      .get(bl);

    if (!row) {
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({
      success: true,
      data: row,
    });
  }

  // ===============================
  // USER SEARCH (requires terminal)
  // ===============================
  if (!terminal || (!bl && !taxId)) {
    return NextResponse.json({ success: false });
  }

  let row;

  // Search by BL
  if (bl) {
    row = db
      .prepare(`
        SELECT * FROM shipments
        WHERE LOWER(terminal) = LOWER(?)
        AND LOWER(bl_number) = LOWER(?)
      `)
      .get(terminal, bl);
  }

  // Search by Tax ID
  else if (taxId) {
    row = db
      .prepare(`
        SELECT * FROM shipments
        WHERE LOWER(terminal) = LOWER(?)
        AND LOWER(tax_id) = LOWER(?)
      `)
      .get(terminal, taxId);
  }

  if (!row) {
    return NextResponse.json({ success: false });
  }

  return NextResponse.json({
    success: true,
    data: row,
  });
}
