import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { verifyUser } from "@/lib/authGuard";

export async function POST(req: NextRequest) {

  // ===============================
  // USER SECURITY CHECK
  // ===============================
  if (!verifyUser(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

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

    const filename = `${bl}_${timestamp}.pdf`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // ===============================
    // Upload to Supabase
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

    const { data } = supabase.storage
      .from("documents")
      .getPublicUrl(filename);

    const publicUrl = data.publicUrl;

    // ===============================
    // UPDATE (Postgres)
    // ===============================
    await db.query(
      `
      UPDATE shipments
      SET
        pdf_filename = $1,
        pdf_uploaded_at = $2,
        pdf_status = $3
      WHERE LOWER(bl_number) = LOWER($4)
      `,
      [
        publicUrl,
        now.toISOString(),
        "UNDER REVIEW",
        bl,
      ]
    );

    return NextResponse.json({
      success: true,
      url: publicUrl,
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