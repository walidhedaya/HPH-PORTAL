import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = db
      .prepare(`SELECT * FROM shipments ORDER BY created_at DESC`)
      .all();

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
