import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { verifyUser } from "@/lib/authGuard";
import { safeStorageName } from "@/lib/security";
import { validateCsrfOrigin } from "@/lib/csrfGuard";

export async function POST(req: NextRequest) {

  // ===============================
  // 🔐 USER AUTH
  // ===============================
  const user = await verifyUser(req);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

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
      SELECT id, tax_id, draft_invoice_filename, payment_link, payment_proof_filename
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

    if (!shipment.draft_invoice_filename || !shipment.payment_link) {
      return NextResponse.json(
        { error: "Draft invoice and payment link are required before uploading payment proof" },
        { status: 409 }
      );
    }

    if (shipment.payment_proof_filename) {
      return NextResponse.json(
        { error: "Payment proof already uploaded" },
        { status: 409 }
      );
    }

    // ===============================
    // 🔐 ACCESS CONTROL
    // ===============================
    if (!user.full_access) {
      const access = await db.query(
        `
        SELECT 1
        FROM user_tax_access
        WHERE user_id = $1
        AND LOWER(tax_id) = LOWER($2)
        LIMIT 1
        `,
        [user.id, shipment.tax_id]
      );

      if (access.rowCount === 0) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // ===============================
    // 📁 STORAGE (PRIVATE)
    // ===============================
    const filename = `PAYMENT_${safeStorageName(bl)}_${Date.now()}.pdf`;
    const storagePath = `payment/${filename}`;

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
        payment_proof_filename = $1,
        payment_uploaded_at = $2
      WHERE id = $3
      `,
      [
        storagePath,
        now.toISOString(),
        shipment.id
      ]
    );

    // ===============================
    // 🧾 LOG (IMPORTANT)
    // ===============================
    await db.query(
      `
      INSERT INTO admin_actions_log
      (shipment_id, bl_number, action_type, action_status, admin_id)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        shipment.id,
        bl,
        "UPLOAD_PAYMENT_PROOF",
        "USER_UPLOADED",
        user.id
      ]
    );

    return NextResponse.json({
      success: true,
      path: storagePath,
    });

  } catch (err) {

    console.error("Upload Payment Proof error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
