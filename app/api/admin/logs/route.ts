import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyAdmin } from "@/lib/adminGuard";

export async function GET(req: NextRequest) {

  const admin = verifyAdmin(req);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const sortBy = searchParams.get("sort_by") || "created_at";
    const order = searchParams.get("order") === "asc" ? "ASC" : "DESC";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const cursor = searchParams.get("cursor");

    // 🔍 Filters
    const adminId = searchParams.get("admin_id");
    const status = searchParams.get("status");
    const bl = searchParams.get("bl");

    const allowedSort = ["created_at", "admin_id", "bl_number"];

    if (!allowedSort.includes(sortBy)) {
      return NextResponse.json(
        { error: "Invalid sort field" },
        { status: 400 }
      );
    }

    let query = `
      SELECT
        id,
        shipment_id,
        bl_number,
        action_type,
        action_status,
        comment,
        admin_id,
        created_at
      FROM admin_actions_log
      WHERE 1=1
    `;

    const values: any[] = [];
    let i = 1;

    // ===============================
    // 🔍 FILTERS
    // ===============================

    if (adminId) {
      query += ` AND admin_id = $${i++}`;
      values.push(Number(adminId));
    }

    if (status) {
      query += ` AND action_status = $${i++}`;
      values.push(status.toUpperCase());
    }

    if (bl) {
      query += ` AND LOWER(bl_number) = LOWER($${i++})`;
      values.push(bl);
    }

    // ===============================
    // 🔥 KEYSET PAGINATION
    // ===============================
    if (cursor && sortBy === "created_at") {
      query += ` AND created_at < $${i++}`;
      values.push(cursor);
    }

    query += ` ORDER BY ${sortBy} ${order} LIMIT $${i}`;
    values.push(limit);

    const { rows } = await db.query(query, values);

    return NextResponse.json({
      success: true,
      count: rows.length,
      next_cursor: rows.length > 0 ? rows[rows.length - 1].created_at : null,
      data: rows
    });

  } catch (error) {
    console.error("ADMIN LOGS ERROR:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

// force git diff
const __force_update_logs_filters = true;