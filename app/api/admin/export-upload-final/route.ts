import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
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

    const now = new Date();

    const fileName = `${booking}_${Date.now()}.pdf`;
    const storagePath = `export-final/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.error(error);
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
    // UPDATE (Postgres)
    // ===============================
    await db.query(
      `
      UPDATE export_shipments
      SET 
        final_invoice_filename = $1,
        final_invoice_uploaded_at = $2
      WHERE LOWER(booking_number) = LOWER($3)
      `,
      [
        publicUrl,
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