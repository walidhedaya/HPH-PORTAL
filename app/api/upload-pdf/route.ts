import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db from "@/lib/db";

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

    // ===============================
    // SAVE IN: public/uploads/import-documents
    // ===============================
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "import-documents"
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace("T", "_")
      .split(".")[0];

    const filename = `${bl}_${timestamp}.pdf`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // ===============================
    // UPDATE DATABASE
    // ===============================
    db.prepare(`
      UPDATE shipments
      SET
        pdf_filename = ?,
        pdf_uploaded_at = ?,
        pdf_status = ?
      WHERE bl_number = ?
    `).run(
      filename,
      now.toISOString(),
      "UNDER REVIEW",
      bl
    );

    return NextResponse.json({
      success: true,
      filename,
      url: `/uploads/import-documents/${filename}`,
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
