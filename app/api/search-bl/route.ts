import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const bl = searchParams.get("bl");
    const taxId = searchParams.get("tax_id");
    const terminal = searchParams.get("terminal");

    // ===============================
    // 🔐 ADMIN FLOW (ISOLATED)
    // ===============================
    const admin = await verifyAdmin(req);

    if (admin) {
      if (!bl) {
        return NextResponse.json(
          { error: "BL is required for admin search" },
          { status: 400 }
        );
      }

      const { rows } = await db.query(
        `
        SELECT 
          id,
          bl_number,
          tax_id,
          terminal,
          consignee,
          pdf_status
        FROM shipments
        WHERE LOWER(bl_number) = LOWER($1)
        `,
        [bl]
      );

      return NextResponse.json({
        success: rows.length > 0,
        data: rows[0] || null,
      });
    }

    // ===============================
    // 🔐 USER AUTH
    // ===============================
    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // ===============================
    // VALIDATION
    // ===============================
    if (!terminal || (!bl && !taxId)) {
      return NextResponse.json({ success: false });
    }

    // ===============================
    // 🔍 USER SEARCH BY BL
    // ===============================
    if (bl) {
      const { rows } = await db.query(
        `
        SELECT
          id,
          bl_number,
          tax_id,
          terminal,
          consignee,
          pdf_status,
          admin_comment
        FROM shipments s
        WHERE LOWER(terminal) = LOWER($1)
        AND LOWER(bl_number) = LOWER($2)
        AND EXISTS (
          SELECT 1
          FROM user_tax_access uta
          WHERE uta.user_id = $3
          AND LOWER(uta.tax_id) = LOWER(s.tax_id)
        )
        `,
        [terminal, bl, user.id]
      );

      return NextResponse.json({
        success: rows.length > 0,
        data: rows[0] || null,
      });
    }

    // ===============================
    // 🔍 USER SEARCH BY TAX ID
    // ===============================
    if (taxId) {
      const { rows } = await db.query(
        `
        SELECT
          id,
          bl_number,
          tax_id,
          terminal,
          consignee,
          pdf_status,
          admin_comment
        FROM shipments s
        WHERE LOWER(terminal) = LOWER($1)
        AND LOWER(tax_id) = LOWER($2)
        AND EXISTS (
          SELECT 1
          FROM user_tax_access uta
          WHERE uta.user_id = $3
          AND LOWER(uta.tax_id) = LOWER($2)
        )
        `,
        [terminal, taxId, user.id]
      );

      return NextResponse.json({
        success: rows.length > 0,
        data: rows,
      });
    }

    return NextResponse.json({ success: false });

  } catch (error) {
    console.error("SEARCH BL ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}