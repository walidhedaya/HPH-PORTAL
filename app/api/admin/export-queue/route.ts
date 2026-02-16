import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const rows = db
      .prepare(`
        SELECT * FROM export_shipments
        ORDER BY created_at DESC
      `)
      .all();

    const withStage = rows.map((row: any) => {
      let stage = "BOOKING CREATED";

      if (row.export_docs_filename)
        stage = "DOCS UPLOADED";

      if (row.draft_invoice_filename)
        stage = "DRAFT UPLOADED";

      if (row.payment_proof_filename)
        stage = "PAYMENT UPLOADED";

      if (row.final_invoice_filename)
        stage = "FINAL UPLOADED";

      if (row.gate_pass_filename)
        stage = "GATE ISSUED";

      return { ...row, stage };
    });

    return NextResponse.json({
      success: true,
      data: withStage,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
