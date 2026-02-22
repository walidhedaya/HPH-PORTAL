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

    const filename = `${bl}_GATE_${timestamp}.pdf`;
    const filePath = `gate/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // ===============================
    // Upload to Supabase
    // ===============================
    const { error } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, {
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
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    // ===============================
    // UPDATE (Postgres)
    // ===============================
    await db.query(
      `
      UPDATE shipments
      SET
        gate_pass_filename = $1,
        gate_pass_uploaded_at = $2
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
    console.error("Gate Slip Upload Error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}