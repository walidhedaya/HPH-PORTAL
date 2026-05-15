import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";
import { validateCsrfOrigin } from "@/lib/csrfGuard";

export async function POST(req: NextRequest) {

  // ===============================
  // 🔐 Admin Verification
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

  const client = await db.connect();
  let transactionStarted = false;

  const logAdminCreationAttempt = async ({
    createdBy,
    createdUser,
    createdRole,
    status,
    reason,
  }: {
    createdBy: number;
    createdUser: string;
    createdRole: string;
    status: "success" | "failure";
    reason?: string;
  }) => {
    try {
      await client.query(
        `
        INSERT INTO admin_actions_log
        (action_type, action_status, comment, admin_id)
        VALUES ($1, $2, $3, $4)
        `,
        [
          "create_admin_user",
          status,
          JSON.stringify({
            created_by: createdBy,
            created_user: createdUser,
            created_role: createdRole,
            timestamp: new Date().toISOString(),
            reason,
          }),
          createdBy,
        ]
      );
    } catch (logError) {
      console.error("ADMIN CREATE USER AUDIT LOG ERROR:", logError);
    }
  };

  try {
    const body = await req.json();

    const tax_id = String(body.tax_id || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "");
    const superAdminPassword = String(body.super_admin_password || "");

    // ✅ sanitize + deduplicate
    const allowedTaxIds: string[] = Array.from(
      new Set(
        (body.allowed_tax_ids || [])
          .map((t: any) => String(t).trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const fullAccess: boolean = body.full_access === true;

    // ===============================
    // Validation
    // ===============================
    if (!tax_id || !password || !role) {
      if (role === "admin") {
        await logAdminCreationAttempt({
          createdBy: admin.id,
          createdUser: tax_id,
          createdRole: role,
          status: "failure",
          reason: "Missing required fields",
        });
      }

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
      if (role === "admin") {
        await logAdminCreationAttempt({
          createdBy: admin.id,
          createdUser: tax_id,
          createdRole: role,
          status: "failure",
          reason: "Password must be at least 8 characters",
        });
      }

      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (role === "admin") {
      if (admin.role !== "super_admin") {
        await logAdminCreationAttempt({
          createdBy: admin.id,
          createdUser: tax_id,
          createdRole: role,
          status: "failure",
          reason: "Only super admins can create admins",
        });

        return NextResponse.json(
          { error: "Only super admins can create admins" },
          { status: 403 }
        );
      }

      const { rows: superAdminRows } = await client.query(
        `
        SELECT password
        FROM users
        WHERE id = $1
        AND role = 'super_admin'
        LIMIT 1
        `,
        [admin.id]
      );

      const validSuperAdminPassword =
        superAdminRows.length > 0 &&
        await bcrypt.compare(superAdminPassword, superAdminRows[0].password);

      if (!validSuperAdminPassword) {
        await logAdminCreationAttempt({
          createdBy: admin.id,
          createdUser: tax_id,
          createdRole: role,
          status: "failure",
          reason: "Invalid super admin password",
        });

        return NextResponse.json(
          { error: "Invalid super admin password" },
          { status: 403 }
        );
      }
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
      `SELECT id FROM users WHERE LOWER(tax_id) = LOWER($1)`,
      [tax_id]
    );

    if (existing.length > 0) {
      if (role === "admin") {
        await logAdminCreationAttempt({
          createdBy: admin.id,
          createdUser: tax_id,
          createdRole: role,
          status: "failure",
          reason: "User already exists",
        });
      }

      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // ===============================
    // Start Transaction
    // ===============================
    await client.query("BEGIN");
    transactionStarted = true;

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
    // Bulk insert tax access
    // ===============================
    if (!fullAccess && role === "user") {

      const values: any[] = [];
      const placeholders: string[] = [];

      let index = 1;

      for (const t of allowedTaxIds) {
        values.push(userId, t);
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

    if (role === "admin") {
      await logAdminCreationAttempt({
        createdBy: admin.id,
        createdUser: tax_id,
        createdRole: role,
        status: "success",
      });
    }

    // ===============================
    // Commit
    // ===============================
    await client.query("COMMIT");
    transactionStarted = false;

    // ===============================
    // Logging
    // ===============================
    console.log("ADMIN CREATE USER", {
      admin_id: admin.id,
      role,
      created_user: tax_id,
      full_access: fullAccess,
      allowed_count: allowedTaxIds.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      user_id: userId
    });

  } catch (err: any) {

    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("CREATE USER ERROR:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}
