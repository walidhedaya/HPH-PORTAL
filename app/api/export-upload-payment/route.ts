import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import path from "path";
import fs from "fs";

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

    // Ensure upload folder exists
    const uploadDir = path.join(
      process.cwd(),
      "public/uploads/export-payments"
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create unique filename
    const fileName = `${booking}_${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Update DB
    db.prepare(`
      UPDATE export_shipments
      SET 
        payment_proof_filename = ?,
        payment_uploaded_at = datetime('now')
      WHERE booking_number = ?
    `).run(fileName, booking);

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
