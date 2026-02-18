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
    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace("T", "_")
      .split(".")[0];

    // ===============================
    // Storage path
    // documents/export-payments/
    // ===============================
    const fileName = `PAYMENT_${booking}_${timestamp}.pdf`;
    const storagePath = `export-payments/${fileName}`;

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

    // ===============================
    // Get Public URL
    // ===============================
    const { data } = supabase.storage
      .from("documents")
      .getPublicUrl(storagePath);

    const publicUrl = data.publicUrl;

    // ===============================
    // Update DB (case safe)
    // ===============================
    db.prepare(`
      UPDATE export_shipments
      SET 
        payment_proof_filename = ?,
        payment_uploaded_at = ?
      WHERE LOWER(booking_number) = LOWER(?)
    `).run(
      publicUrl,
      now.toISOString(),
      booking
    );

    const updated = db
      .prepare(`SELECT * FROM export_shipments WHERE LOWER(booking_number) = LOWER(?)`)
      .get(booking);

    return NextResponse.json({
      success: true,
      data: updated,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Upload failed" },
      { status: 500 }
    );
  }
}
