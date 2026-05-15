import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";
import { validateCsrfOrigin } from "@/lib/csrfGuard";

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  const client = await db.connect();
  let transactionStarted = false;

  try {
    const body = await req.json();

    const taxId = String(body.tax_id || "").trim().toLowerCase();
    const password = String(body.password || "");
    const hasBlockedUpdate = typeof body.is_blocked === "boolean";
    const isBlocked = body.is_blocked === true;
    const allowedTaxIds: string[] = Array.from(
      new Set(
        (body.allowed_tax_ids || [])
          .map((t: any) => String(t).trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (!taxId) {
      return NextResponse.json(
        { error: "Tax ID is required" },
        { status: 400 }
      );
    }

    if (!password && allowedTaxIds.length === 0 && !hasBlockedUpdate) {
      return NextResponse.json(
        { error: "Enter a new password, tax IDs to add, or blocked status" },
        { status: 400 }
      );
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (allowedTaxIds.length > 50) {
      return NextResponse.json(
        { error: "Too many tax IDs (max 50)" },
        { status: 400 }
      );
    }

    const { rows } = await client.query(
      `
      SELECT id, tax_id, role
      FROM users
      WHERE LOWER(tax_id) = LOWER($1)
      LIMIT 1
      `,
      [taxId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetUser = rows[0];

    if (targetUser.role === "super_admin" && admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Not allowed to edit super admin" },
        { status: 403 }
      );
    }

    await client.query("BEGIN");
    transactionStarted = true;

    let passwordUpdated = false;
    let blockStatusUpdated = false;

    if (password) {
      const hash = await bcrypt.hash(password, 10);

      await client.query(
        `
        UPDATE users
        SET password = $1
        WHERE id = $2
        `,
        [hash, targetUser.id]
      );

      passwordUpdated = true;
    }

    if (hasBlockedUpdate) {
      await client.query(
        `
        UPDATE users
        SET is_blocked = $1
        WHERE id = $2
        `,
        [isBlocked, targetUser.id]
      );

      blockStatusUpdated = true;
    }

    let addedTaxIds = 0;

    for (const allowedTaxId of allowedTaxIds) {
      const insert = await client.query(
        `
        INSERT INTO user_tax_access (user_id, tax_id)
        SELECT $1, $2
        WHERE NOT EXISTS (
          SELECT 1
          FROM user_tax_access
          WHERE user_id = $1
          AND LOWER(tax_id) = LOWER($2)
        )
        `,
        [targetUser.id, allowedTaxId]
      );

      addedTaxIds += insert.rowCount ?? 0;
    }

    await client.query("COMMIT");
    transactionStarted = false;

    console.log("ADMIN EDIT USER", {
      admin_id: admin.id,
      edited_user: targetUser.tax_id,
      password_updated: passwordUpdated,
      block_status_updated: blockStatusUpdated,
      is_blocked: hasBlockedUpdate ? isBlocked : undefined,
      added_tax_ids: addedTaxIds,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      password_updated: passwordUpdated,
      block_status_updated: blockStatusUpdated,
      is_blocked: hasBlockedUpdate ? isBlocked : undefined,
      added_tax_ids: addedTaxIds,
    });

  } catch (err) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("EDIT USER ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}
