import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { verifyUser } from "@/lib/authGuard";
import { safeStorageName } from "@/lib/security";

export async function POST(req: NextRequest) {

  // ===============================
  // 🔐 AUTH
  // ===============================
  const user = await verifyUser(req);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {

    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const blRaw = formData.get("bl") as string | null;

    if (!file || !blRaw) {
      return NextResponse.json(
        { error: "Missing file or BL" },
        { status: 400 }
      );
    }

    const bl = blRaw.trim().toUpperCase();

    // ===============================
    // 🔐 FILE SIZE VALIDATION
    // ===============================
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Invalid file size (max 10MB)" },
        { status: 400 }
      );
    }

    // ===============================
    // 🔐 FILE TYPE VALIDATION (MAGIC BYTES)
    // ===============================
    const buffer = Buffer.from(await file.arrayBuffer());

    const isPDF =
      buffer.length > 4 &&
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
    // 🔐 GET LATEST SHIPMENT (CONSISTENCY)
    // ===============================
    const shipmentResult = await db.query(
      `
      SELECT id, tax_id
      FROM shipments
      WHERE LOWER(bl_number) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [bl]
    );

    if (shipmentResult.rowCount === 0) {
      return NextResponse.json(
        { error: "BL not found" },
        { status: 404 }
      );
    }

    const shipment = shipmentResult.rows[0];

    // ===============================
    // 🔐 ACCESS CONTROL (BOLA PROTECTION)
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
    // 📁 STORAGE (PRIVATE ONLY)
    // ===============================
    const filename = `${safeStorageName(bl)}_${Date.now()}.pdf`;
    const storagePath = `pdf/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false, // 🚫 prevent overwrite attacks
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);

      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    // ===============================
    // 🔥 ATOMIC UPDATE (SAFE TARGET)
    // ===============================
    await db.query(
      `
      UPDATE shipments
      SET
        pdf_filename = $1,
        pdf_uploaded_at = NOW(),
        pdf_status = 'UNDER REVIEW'
      WHERE id = $2
      `,
      [storagePath, shipment.id]
    );

    // ===============================
    // ✅ RESPONSE
    // ===============================
    return NextResponse.json({
      success: true,
      path: storagePath,
    });

  } catch (err) {

    console.error("UPLOAD PDF ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );

  }
}
