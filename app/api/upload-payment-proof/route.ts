import { NextResponse } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
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

    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace("T", "_")
      .split(".")[0];

    const filename = `PAYMENT_${bl}_${timestamp}.pdf`;
    const storagePath = `payment/${filename}`;

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
        { error: "Upload failed" },
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
      UPDATE shipments
      SET
        payment_proof_filename = $1,
        payment_uploaded_at = $2
      WHERE LOWER(bl_number) = LOWER($3)
      `,
      [
        publicUrl,
        now.toISOString(),
        bl
      ]
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