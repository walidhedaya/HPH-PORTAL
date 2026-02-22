import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT * FROM shipments ORDER BY created_at DESC`
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err: any) {
    console.error("BLS ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}