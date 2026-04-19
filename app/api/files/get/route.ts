import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET as string;

export async function GET(req: NextRequest) {
  try {
    // ===============================
    // ENV CHECK
    // ===============================
    if (!SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    // ===============================
    // AUTH
    // ===============================
    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user: any;

    try {
      user = jwt.verify(token, SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // ===============================
    // PARAMS
    // ===============================
    const { searchParams } = new URL(req.url);

    const shipmentId = searchParams.get("shipment_id");
    const type = searchParams.get("type");

    if (!shipmentId || !type) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // ===============================
    // VALIDATE TYPE
    // ===============================
    const allowedTypes = ["pdf", "draft", "final", "payment", "gate"];

    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // ===============================
    // GET SHIPMENT
    // ===============================
    const result = await db.query(
      `
      SELECT 
        id,
        tax_id,
        pdf_filename,
        draft_invoice_filename,
        final_invoice_filename,
        payment_proof_filename,
        gate_pass_filename
      FROM shipments
      WHERE id = $1
      `,
      [shipmentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const shipment = result.rows[0];

    // ===============================
    // ACCESS CONTROL
    // ===============================
    let allowed = false;

    if (user.role === "admin" || user.role === "super_admin") {
      allowed = true;
    } else {
      const access = await db.query(
        `
        SELECT 1 FROM user_tax_access
        WHERE user_id = $1
        AND LOWER(tax_id) = LOWER($2)
        `,
        [user.id, shipment.tax_id]
      );

      if ((access.rowCount ?? 0) > 0) {
        allowed = true;
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ===============================
    // SAFE FILE MAPPING
    // ===============================
    let filename: string | null = null;

    if (type === "pdf") filename = shipment.pdf_filename;
    if (type === "draft") filename = shipment.draft_invoice_filename;
    if (type === "final") filename = shipment.final_invoice_filename;
    if (type === "payment") filename = shipment.payment_proof_filename;
    if (type === "gate") filename = shipment.gate_pass_filename;

    if (!filename) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    // ===============================
    // SAFE RESPONSE (NO FILE LEAK)
    // ===============================
    return NextResponse.json({
      success: true,
      message: "File authorized"
    });

  } catch (error) {
    console.error("FILE GET ERROR:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}