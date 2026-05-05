import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {

  // ===============================
  // 🔐 ADMIN AUTH
  // ===============================
  const admin = await verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {

    const { searchParams } = new URL(req.url);

    const terminalRaw = searchParams.get("terminal");
    const limitRaw = searchParams.get("limit");
    const cursor = searchParams.get("cursor");

    if (!terminalRaw) {
      return NextResponse.json({ success: false });
    }

    const terminal = String(terminalRaw).trim();

    // 🔐 basic validation
    if (terminal.length > 50) {
      return NextResponse.json(
        { error: "Invalid terminal" },
        { status: 400 }
      );
    }

    // 🔥 pagination
    const limit = Math.min(Number(limitRaw) || 50, 100);

    let query = `
      SELECT 
        id,
        bl_number,
        terminal,
        pdf_status,
        pdf_filename,
        draft_invoice_filename,
        payment_proof_filename,
        final_invoice_filename,
        gate_pass_filename,
        pdf_uploaded_at,
        draft_invoice_uploaded_at,
        payment_uploaded_at,
        final_invoice_uploaded_at,
        gate_pass_uploaded_at,
        handling_admin,
        created_at
      FROM shipments
      WHERE LOWER(terminal) = LOWER($1)
    `;

    const values: any[] = [terminal];
    let index = 2;

    // 🔥 keyset pagination
    if (cursor) {
      query += `
        AND COALESCE(
          gate_pass_uploaded_at,
          final_invoice_uploaded_at,
          payment_uploaded_at,
          draft_invoice_uploaded_at,
          pdf_uploaded_at,
          created_at
        ) < $${index++}
      `;
      values.push(cursor);
    }

    query += `
      ORDER BY 
        COALESCE(
          gate_pass_uploaded_at,
          final_invoice_uploaded_at,
          payment_uploaded_at,
          draft_invoice_uploaded_at,
          pdf_uploaded_at,
          created_at
        ) DESC
      LIMIT $${index}
    `;

    values.push(limit);

    const { rows } = await db.query(query, values);

    const data = rows.map((row: any) => {

      let stage = "OPEN";

      if (row.gate_pass_filename) {
        stage = "GATE SLIP UPLOADED";
      } else if (row.final_invoice_filename) {
        stage = "FINAL INVOICE UPLOADED";
      } else if (row.payment_proof_filename) {
        stage = "PAYMENT PROOF UPLOADED";
      } else if (row.draft_invoice_filename) {
        stage = "DRAFT UPLOADED";
      } else if (row.pdf_status === "APPROVED") {
        stage = "APPROVED";
      } else if (row.pdf_status === "NEED MORE DOCS") {
        stage = "NEED MORE DOCUMENTS";
      } else if (row.pdf_filename) {
        stage = "DOCUMENTS UPLOADED";
      }

      const lastTime =
        row.gate_pass_uploaded_at ||
        row.final_invoice_uploaded_at ||
        row.payment_uploaded_at ||
        row.draft_invoice_uploaded_at ||
        row.pdf_uploaded_at ||
        row.created_at;

      return {
        bl_number: row.bl_number,
        terminal: row.terminal,
        stage,
        timestamp: lastTime,
        handling_admin: row.handling_admin || "-",
      };
    });

    return NextResponse.json({
      success: true,
      count: data.length,
      next_cursor: data.length ? data[data.length - 1].timestamp : null,
      data,
    });

  } catch (error) {

    console.error("ADMIN QUEUE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );

  }
}