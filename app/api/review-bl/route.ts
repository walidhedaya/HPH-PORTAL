import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";

export async function POST(req: NextRequest) {

  const admin = await verifyAdmin(req);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const bl = String(body.bl || "").trim().toUpperCase();
    const status = String(body.status || "").trim().toUpperCase();
    const comment = String(body.comment || "").trim();

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

    // ===============================
    // UPDATE + RETURN ID
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
      RETURNING id
      `,
      [
        status,
        comment || null,
        now,
        `admin_${admin.id}`,
        bl
      ]
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json(
        { error: "BL not found" },
        { status: 404 }
      );
    }

    const shipmentId = result.rows[0].id;

    // ===============================
    // 🔐 IMMUTABLE LOG
    // ===============================
    await db.query(
      `
      INSERT INTO admin_actions_log
      (shipment_id, bl_number, action_type, action_status, comment, admin_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        shipmentId,
        bl,
        "REVIEW",
        status,
        comment || null,
        admin.id
      ]
    );

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