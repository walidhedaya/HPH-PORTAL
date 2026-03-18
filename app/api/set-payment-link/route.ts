import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { bl, payment_link } = await req.json();

    if (!bl || !payment_link) {
      return NextResponse.json(
        { error: "Missing BL or payment link" },
        { status: 400 }
      );
    }

    const cleanBl = String(bl).trim().toUpperCase();

    // ===============================
    // 🔥 AUTO FIX: Create column if not exists
    // ===============================
    await db.query(`
      ALTER TABLE shipments 
      ADD COLUMN IF NOT EXISTS payment_link TEXT
    `);

    // ===============================
    // Update payment link
    // ===============================
    const result = await db.query(
      `
      UPDATE shipments
      SET payment_link = $1
      WHERE LOWER(bl_number) = LOWER($2)
      `,
      [payment_link, cleanBl]
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
      payment_link,
    });

  } catch (err) {
    console.error("SET PAYMENT LINK ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}