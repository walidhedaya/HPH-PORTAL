import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/adminGuard";
import { safeStorageName } from "@/lib/security";

export async function POST(req: NextRequest) {

  // ===============================
  // 🔐 ADMIN SECURITY CHECK
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
    // 🔐 STRICT FILE VALIDATION
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

    const shipmentRes = await db.query(
      `
      SELECT id, pdf_filename, pdf_status, draft_invoice_filename
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

    if (!shipment.pdf_filename || shipment.pdf_status !== "APPROVED") {
      return NextResponse.json(
        { error: "Documents must be reviewed and approved before uploading draft invoice" },
        { status: 409 }
      );
    }

    if (shipment.draft_invoice_filename) {
      return NextResponse.json(
        { error: "Draft invoice already uploaded" },
        { status: 409 }
      );
    }

    // ===============================
    // 📁 STORAGE PATH (PRIVATE)
    // ===============================
    const filename = `DRAFT_${safeStorageName(bl)}_${Date.now()}.pdf`;
    const storagePath = `draft/${filename}`;

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
    // 🔥 SAFE UPDATE + GET ID
    // ===============================
    const result = await db.query(
      `
      UPDATE shipments
      SET
        draft_invoice_filename = $1,
        draft_invoice_uploaded_at = $2,
        status = 'WAITING_FOR_PAYMENT'
      WHERE id = $3
      RETURNING id
      `,
      [
        storagePath,
        now.toISOString(),
        shipment.id
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
    // 🧾 ADMIN ACTION LOG (CRITICAL)
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
        "UPLOAD_DRAFT",
        "SUCCESS",
        null,
        admin.id
      ]
    );

    return NextResponse.json({
      success: true,
      path: storagePath,
    });

  } catch (err) {

    console.error("Upload draft invoice error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );

  }
}
