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

    db.prepare(`
      UPDATE export_shipments
      SET 
        draft_invoice_filename = ?,
        draft_invoice_uploaded_at = datetime('now')
      WHERE booking_number = ?
    `).run(publicUrl, booking);

    const updated = db
      .prepare(`SELECT * FROM export_shipments WHERE booking_number = ?`)
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
