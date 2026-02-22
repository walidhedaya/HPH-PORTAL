import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { tax_id, password, role } = await req.json();

    const cleanTaxId = String(tax_id).trim();

    if (!cleanTaxId || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "user") {
      return NextResponse.json(
        { error: "Invalid role value" },
        { status: 400 }
      );
    }

    // ===============================
    // Check if user exists
    // ===============================
    const { rows: existing } = await db.query(
      `SELECT id FROM users WHERE tax_id = $1`,
      [cleanTaxId]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // ===============================
    // Hash password
    // ===============================
    const hash = await bcrypt.hash(password, 10);

    // ===============================
    // Insert user
    // ===============================
    await db.query(
      `
      INSERT INTO users (tax_id, password, role, created_at)
      VALUES ($1, $2, $3, $4)
      `,
      [
        cleanTaxId,
        hash,
        role,
        new Date().toISOString(),
      ]
    );

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}