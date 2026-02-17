import { NextResponse } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const bl = formData.get("bl") as string | null;

    if (!file || !bl) {
      return NextResponse.json(
        { error: "Missing file or BL number" },
        { status: 400 }
      );
    }

    const now = new Date();

    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace("T", "_")
      .split(".")[0];

    const filename = `${bl}_${timestamp}.pdf`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // ===============================
    // Upload to Supabase Storage
    // ===============================
    const { error } = await supabase.storage
      .from("documents")
      .upload(filename, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    // ===============================
    // Update Database (STORE FILENAME ONLY)
    // ===============================
    db.prepare(`
      UPDATE shipments
      SET
        pdf_filename = ?,
        pdf_uploaded_at = ?,
        pdf_status = ?
      WHERE bl_number = ?
    `).run(
      filename,               // ✅ ONLY filename
      now.toISOString(),
      "UNDER REVIEW",
      bl
    );

    return NextResponse.json({
      success: true,
      filename,
      status: "UNDER REVIEW",
    });

  } catch (err) {
    console.error("Upload PDF error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
