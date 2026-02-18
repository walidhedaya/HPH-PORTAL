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

    // ===============================
    // FILE NAME + STORAGE PATH
    // documents/payment/
    // ===============================
    const filename = `PAYMENT_${bl}_${timestamp}.pdf`;
    const storagePath = `payment/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // ===============================
    // UPLOAD TO SUPABASE STORAGE
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
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    // ===============================
    // GET PUBLIC URL
    // ===============================
    const { data } = supabase.storage
      .from("documents")
      .getPublicUrl(storagePath);

    const publicUrl = data.publicUrl;

    // ===============================
    // UPDATE DATABASE (CASE SAFE)
    // ===============================
    db.prepare(`
      UPDATE shipments
      SET
        payment_proof_filename = ?,
        payment_uploaded_at = ?
      WHERE LOWER(bl_number) = LOWER(?)
    `).run(
      publicUrl,
      now.toISOString(),
      bl
    );

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });

  } catch (err) {
    console.error("Upload Payment Proof error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
