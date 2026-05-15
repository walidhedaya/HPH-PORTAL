import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyUser } from "@/lib/authGuard";
import { validateCsrfOrigin } from "@/lib/csrfGuard";

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {

  // ===============================
  // USER SECURITY CHECK
  // ===============================
  const user = await verifyUser(req);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

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
    const cleanTaxId = String(tax_id || "").trim();
    const cleanTerminal = String(terminal || "").trim();

    if (
      cleanBooking.length > 80 ||
      cleanTaxId.length > 50 ||
      cleanTerminal.length > 50
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid booking data" },
        { status: 400 }
      );
    }

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
    const createdIp = getClientIp(req);
    const userAgent = (req.headers.get("user-agent") || "unknown").slice(0, 500);
    const createdByUsername = String(user.tax_id || user.id);

    await db.query(
      `
      INSERT INTO export_shipments
      (
        booking_number,
        tax_id,
        terminal,
        service_type,
        created_at,
        created_by_user_id,
        created_by_username,
        created_ip,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        cleanBooking,
        cleanTaxId,
        cleanTerminal,
        "ENTRY",
        now,
        user.id,
        createdByUsername,
        createdIp,
        userAgent,
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
