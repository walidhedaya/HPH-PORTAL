import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";
import { validateCsrfOrigin } from "@/lib/csrfGuard";

const defaultAllowedDomains = [
  "paymob.com",
  "paymobsolutions.com",
  "stripe.com",
  "checkout.com",
];

function getAllowedDomains() {
  const configured = process.env.PAYMENT_LINK_ALLOWED_DOMAINS?.split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return configured?.length ? configured : defaultAllowedDomains;
}

function allowsUntrustedPaymentLinks() {
  return (
    process.env.PAYMENT_LINK_TEST_MODE === "true" &&
    process.env.PAYMENT_LINK_ALLOW_UNTRUSTED === "true"
  );
}

export async function POST(req: NextRequest) {
  // ===============================
  // 🔐 AUTH (ADMIN ONLY)
  // ===============================
  const admin = await verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  try {
    const { bl, payment_link } = await req.json();

    if (!bl || !payment_link) {
      return NextResponse.json(
        { error: "Missing BL or payment link" },
        { status: 400 }
      );
    }

    const cleanBl = String(bl).trim().toUpperCase();
    const cleanLink = String(payment_link).trim();

    // ===============================
    // 🔐 STRICT URL VALIDATION
    // ===============================
    let parsed: URL;

    try {
      parsed = new URL(cleanLink);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 🔥 ONLY HTTPS
    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only HTTPS links allowed" },
        { status: 400 }
      );
    }

    // ===============================
    // 🔐 OPTIONAL WHITELIST (STRONGLY RECOMMENDED)
    // ===============================
    const allowedDomains = getAllowedDomains();

    const hostname = parsed.hostname.toLowerCase();

    const allowed = allowedDomains.some(
      (d) => hostname === d || hostname.endsWith("." + d)
    );

    if (!allowed && !allowsUntrustedPaymentLinks()) {
      return NextResponse.json(
        {
          error: `Untrusted payment provider: ${hostname}`,
          allowed_domains: allowedDomains,
        },
        { status: 400 }
      );
    }

    // ===============================
    // 📦 UPDATE LATEST SHIPMENT ONLY
    // ===============================
    const shipmentResult = await db.query(
      `
      SELECT id, draft_invoice_filename
      FROM shipments
      WHERE LOWER(bl_number) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [cleanBl]
    );

    if ((shipmentResult.rowCount ?? 0) === 0) {
      return NextResponse.json(
        { error: "BL not found" },
        { status: 404 }
      );
    }

    const shipment = shipmentResult.rows[0];

    if (!shipment.draft_invoice_filename) {
      return NextResponse.json(
        { error: "Draft invoice must be uploaded before sending payment link" },
        { status: 409 }
      );
    }

    await db.query(
      `
      UPDATE shipments
      SET 
        payment_link = $1,
        payment_link_set_at = NOW()
      WHERE id = $2
      `,
      [parsed.toString(), shipment.id]
    );

    // ===============================
    // 🧾 ADMIN LOG (IMPORTANT)
    // ===============================
    await db.query(
      `
      INSERT INTO admin_actions_log
      (shipment_id, bl_number, action_type, action_status, admin_id)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        shipment.id,
        cleanBl,
        "SET_PAYMENT_LINK",
        "SUCCESS",
        admin.id,
      ]
    );

    return NextResponse.json({
      success: true,
      bl: cleanBl,
      payment_link: parsed.toString(),
    });

  } catch (err) {
    console.error("SET PAYMENT LINK ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
