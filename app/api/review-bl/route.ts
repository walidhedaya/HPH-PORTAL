import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { bl, status, comment, admin } = await req.json();

    if (!bl || !status) {
      return NextResponse.json(
        { error: "Missing BL or status" },
        { status: 400 }
      );
    }

    if (!["APPROVED", "NEED MORE DOCS"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const result = db
      .prepare(`
        UPDATE shipments
        SET
          pdf_status = ?,
          admin_comment = ?,
          reviewed_at = ?,
          handling_admin = ?
        WHERE bl_number = ?
      `)
      .run(
        status,
        comment || null,
        now,
        admin || "Unknown Admin",
        bl
      );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "BL not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      bl,
      status,
    });
  } catch (err) {
    console.error("Review BL error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
