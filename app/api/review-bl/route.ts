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
    const cleanBl = String(bl).trim().toUpperCase();

    // ===============================
    // UPDATE (Postgres)
    // ===============================
    const result = await db.query(
      `
      UPDATE shipments
      SET
        pdf_status = $1,
        admin_comment = $2,
        reviewed_at = $3,
        handling_admin = $4
      WHERE LOWER(bl_number) = LOWER($5)
      `,
      [
        status,
        comment || null,
        now,
        admin || "Unknown Admin",
        cleanBl
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "BL not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      bl: cleanBl,
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