import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";

export async function POST(req: NextRequest) {

  // ===============================
  // 🔐 Admin Verification
  // ===============================
  const admin = verifyAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const client = await db.connect();

  try {

    const body = await req.json();

    const tax_id = String(body.tax_id || "").trim();
    const password = String(body.password || "");
    const role = String(body.role || "");
    const allowedTaxIds: string[] = body.allowed_tax_ids || [];
    const fullAccess: boolean = body.full_access === true;

    // ===============================
    // Validation
    // ===============================
    if (!tax_id || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "user") {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // ===============================
    // 🚨 Prevent privilege escalation
    // ===============================
    if (fullAccess && admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Not allowed to assign full access" },
        { status: 403 }
      );
    }

    // ===============================
    // 🚨 DoS Protection
    // ===============================
    if (!fullAccess && role === "user" && allowedTaxIds.length === 0) {
      return NextResponse.json(
        { error: "User must have allowed_tax_ids or full_access" },
        { status: 400 }
      );
    }

    if (allowedTaxIds.length > 50) {
      return NextResponse.json(
        { error: "Too many tax IDs (max 50)" },
        { status: 400 }
      );
    }

    // ===============================
    // Check existing user
    // ===============================
    const { rows: existing } = await client.query(
      `SELECT id FROM users WHERE tax_id = $1`,
      [tax_id]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // ===============================
    // Start Transaction
    // ===============================
    await client.query("BEGIN");

    // ===============================
    // Hash password
    // ===============================
    const hash = await bcrypt.hash(password, 10);

    // ===============================
    // Insert user
    // ===============================
    const { rows } = await client.query(
      `
      INSERT INTO users (tax_id, password, role, created_at, full_access)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        tax_id,
        hash,
        role,
        new Date().toISOString(),
        fullAccess
      ]
    );

    const userId = rows[0].id;

    // ===============================
    // Bulk insert tax access (FIXED)
    // ===============================
    if (!fullAccess && role === "user") {

      const values: any[] = [];
      const placeholders: string[] = [];

      let index = 1;

      for (const t of allowedTaxIds) {
        const clean = String(t).trim();
        if (!clean) continue;

        values.push(userId, clean);

        placeholders.push(`($${index}, $${index + 1})`);
        index += 2;
      }

      if (placeholders.length > 0) {
        await client.query(
          `
          INSERT INTO user_tax_access (user_id, tax_id)
          VALUES ${placeholders.join(",")}
          `,
          values
        );
      }
    }

    // ===============================
    // Commit
    // ===============================
    await client.query("COMMIT");

    // ===============================
    // Logging
    // ===============================
    console.log("ADMIN CREATE USER", {
      admin_id: admin.id,
      created_user: tax_id,
      full_access: fullAccess,
      allowed_count: allowedTaxIds.length
    });

    return NextResponse.json({
      success: true,
      user_id: userId
    });

  } catch (err: any) {

    await client.query("ROLLBACK");

    console.error("CREATE USER ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}