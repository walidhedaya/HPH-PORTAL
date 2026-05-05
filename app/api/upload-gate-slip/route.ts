import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/adminGuard";
import { safeStorageName } from "@/lib/security";

export async function POST(req: NextRequest) {

  // ===============================
  // 🔐 ADMIN AUTH
  // ===============================
  const admin = await verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {

    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const blRaw = formData.get("bl") as string | null;

    if (!file || !blRaw) {
      return NextResponse.json(
        { error: "Missing file or BL number" },
        { status: 400 }
      );
    }

    const bl = blRaw.trim().toUpperCase();
    const now = new Date();

    // ===============================
    // 🔐 FILE VALIDATION
    // ===============================
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const isPDF =
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    if (!isPDF) {
      return NextResponse.json(
        { error: "Invalid PDF file" },
        { status: 400 }
      );
    }

    // ===============================
    // 📦 GET LATEST SHIPMENT
    // ===============================
    const shipmentRes = await db.query(
      `
      SELECT id, final_invoice_filename, gate_pass_filename
      FROM shipments
      WHERE LOWER(bl_number) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [bl]
    );

    if (shipmentRes.rowCount === 0) {
      return NextResponse.json(
        { error: "BL not found" },
        { status: 404 }
      );
    }

    const shipment = shipmentRes.rows[0];
    const shipmentId = shipment.id;

    if (!shipment.final_invoice_filename) {
      return NextResponse.json(
        { error: "Final invoice must be uploaded before gate slip" },
        { status: 409 }
      );
    }

    if (shipment.gate_pass_filename) {
      return NextResponse.json(
        { error: "Gate slip already uploaded" },
        { status: 409 }
      );
    }

    // ===============================
    // 📁 STORAGE (PRIVATE)
    // ===============================
    const filename = `${safeStorageName(bl)}_GATE_${Date.now()}.pdf`;
    const storagePath = `gate/${filename}`;

    const { error } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);

      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    // ===============================
    // 🔥 UPDATE DB (STORE PATH ONLY)
    // ===============================
    await db.query(
      `
      UPDATE shipments
      SET
        gate_pass_filename = $1,
        gate_pass_uploaded_at = $2
      WHERE id = $3
      `,
      [
        storagePath,
        now.toISOString(),
        shipmentId
      ]
    );

    // ===============================
    // 🧾 ADMIN LOG
    // ===============================
    await db.query(
      `
      INSERT INTO admin_actions_log
      (shipment_id, bl_number, action_type, action_status, admin_id)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        shipmentId,
        bl,
        "UPLOAD_GATE_PASS",
        "SUCCESS",
        admin.id
      ]
    );

    return NextResponse.json({
      success: true,
      path: storagePath,
    });

  } catch (err) {

    console.error("Gate Slip Upload Error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
