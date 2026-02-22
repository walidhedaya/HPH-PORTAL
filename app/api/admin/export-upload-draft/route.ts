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
    const storagePath = `export-draft/${fileName}`;

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