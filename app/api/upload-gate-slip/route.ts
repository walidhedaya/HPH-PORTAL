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

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "gates"
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

    const filename = `${bl}_GATE_${timestamp}.pdf`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    db.prepare(`
      UPDATE shipments
      SET
        gate_pass_filename = ?,
        gate_pass_uploaded_at = ?
      WHERE bl_number = ?
    `).run(filename, now.toISOString(), bl);

    return NextResponse.json({
      success: true,
      filename,
      url: `/uploads/gates/${filename}`,
    });

  } catch (err) {
    console.error("Gate Slip Upload Error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
