import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/adminGuard";
import { safeStorageName } from "@/lib/security";
import { validateCsrfOrigin } from "@/lib/csrfGuard";

export async function POST(req: NextRequest) {

  const admin = await verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  try {

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const booking = formData.get("booking_number") as string;

    if (!file || !booking) {
      return NextResponse.json(
        { success: false, message: "Missing file or booking number" },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Invalid file size (max 10MB)" },
        { status: 400 }
      );
    }

    const now = new Date();

    const fileName = `${safeStorageName(booking)}_${Date.now()}.pdf`;
    const storagePath = `export-draft/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const isPDF =
      buffer.length > 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    if (!isPDF) {
      return NextResponse.json(
        { success: false, message: "Invalid PDF file" },
        { status: 400 }
      );
    }

    const { error } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { success: false, message: "Upload failed" },
        { status: 500 }
      );
    }

    // ===============================
    // UPDATE (PostgreSQL style)
    // ===============================
    await db.query(
      `
      UPDATE export_shipments
      SET 
        draft_invoice_filename = $1,
        draft_invoice_uploaded_at = $2
      WHERE booking_number = $3
      `,
      [
        storagePath,
        now.toISOString(),
        booking
      ]
    );

    // ===============================
    // SELECT updated row
    // ===============================
    const { rows } = await db.query(
      `
      SELECT * FROM export_shipments
      WHERE booking_number = $1
      `,
      [booking]
    );

    return NextResponse.json({
      success: true,
      data: rows[0] || null,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { success: false, message: "Upload failed" },
      { status: 500 }
    );

  }
}
