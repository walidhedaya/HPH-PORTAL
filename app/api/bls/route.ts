import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {

  const admin = verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

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