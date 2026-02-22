import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { booking_number, terminal, tax_id } = body;

    if (!booking_number) {
      return NextResponse.json(
        { success: false, message: "Booking number is required" },
        { status: 400 }
      );
    }

    const cleanBooking = String(booking_number).trim();

    // ===============================
    // Check if booking already exists
    // ===============================
    const { rows: existing } = await db.query(
      `
      SELECT * FROM export_shipments
      WHERE LOWER(booking_number) = LOWER($1)
      `,
      [cleanBooking]
    );

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        data: existing[0],
      });
    }

    // ===============================
    // Insert new booking
    // ===============================
    const now = new Date().toISOString();

    await db.query(
      `
      INSERT INTO export_shipments
      (booking_number, tax_id, terminal, service_type, created_at)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        cleanBooking,
        tax_id || "",
        terminal || "",
        "ENTRY",
        now,
      ]
    );

    // ===============================
    // Select created row
    // ===============================
    const { rows } = await db.query(
      `
      SELECT * FROM export_shipments
      WHERE LOWER(booking_number) = LOWER($1)
      `,
      [cleanBooking]
    );

    return NextResponse.json({
      success: true,
      data: rows[0] || null,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}