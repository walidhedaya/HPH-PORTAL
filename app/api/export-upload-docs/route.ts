import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;
    const booking = formData.get("booking_number") as string;
    const stuffing = formData.get("stuffing") as string;
    const inspection = formData.get("inspection") as string;
    const inspectionContainers = formData.get("inspection_containers") as string;

    if (!file || !booking) {
      return NextResponse.json(
        { success: false, message: "Missing file or booking number" },
        { status: 400 }
      );
    }

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace("T", "_")
      .split(".")[0];

    const fileName = `${booking}_${timestamp}.pdf`;
    const storagePath = `export-documents/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // ===============================
    // Upload to Supabase
    // ===============================
    const { error } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { success: false, message: "Upload failed" },
        { status: 500 }
      );
    }

    const { data } = supabase.storage
      .from("documents")
      .getPublicUrl(storagePath);

    const publicUrl = data.publicUrl;

    // ===============================
    // UPDATE (PostgreSQL style)
    // ===============================
    await db.query(
      `
      UPDATE export_shipments
      SET 
        export_docs_filename = $1,
        export_docs_uploaded_at = $2,
        stuffing = $3,
        inspection = $4,
        inspection_containers = $5
      WHERE LOWER(booking_number) = LOWER($6)
      `,
      [
        publicUrl,
        now.toISOString(),
        stuffing === "1" ? 1 : 0,
        inspection === "1" ? 1 : 0,
        Number(inspectionContainers || 0),
        booking,
      ]
    );

    // ===============================
    // SELECT updated row
    // ===============================
    const { rows } = await db.query(
      `
      SELECT * FROM export_shipments
      WHERE LOWER(booking_number) = LOWER($1)
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