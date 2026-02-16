import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { booking_number, terminal, tax_id } = body;

    // Only booking number is required
    if (!booking_number) {
      return NextResponse.json(
        { success: false, message: "Booking number is required" },
        { status: 400 }
      );
    }

    // Check if booking already exists
    const existing = db
      .prepare(
        `SELECT * FROM export_shipments WHERE booking_number = ?`
      )
      .get(booking_number);

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
      });
    }

    // Insert new booking
    db.prepare(
      `
      INSERT INTO export_shipments
      (booking_number, tax_id, terminal, service_type, created_at)
      VALUES (?, ?, ?, 'ENTRY', datetime('now'))
      `
    ).run(
      booking_number,
      tax_id || "",
      terminal || ""
    );

    const created = db
      .prepare(
        `SELECT * FROM export_shipments WHERE booking_number = ?`
      )
      .get(booking_number);

    return NextResponse.json({
      success: true,
      data: created,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
