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
    // SAVE IN: public/uploads/draft
    // ===============================
    const draftDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "draft"
    );

    if (!fs.existsSync(draftDir)) {
      fs.mkdirSync(draftDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace("T", "_")
      .split(".")[0];

    const filename = `DRAFT_${bl}_${timestamp}.pdf`;
    const filePath = path.join(draftDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // ===============================
    // UPDATE DATABASE
    // ===============================
    db.prepare(`
      UPDATE shipments
      SET
        draft_invoice_filename = ?,
        draft_invoice_uploaded_at = ?
      WHERE bl_number = ?
    `).run(
      filename,
      now.toISOString(),
      bl
    );

    return NextResponse.json({
      success: true,
      filename,
      url: `/uploads/draft/${filename}`,
    });

  } catch (err) {
    console.error("Upload draft invoice error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
