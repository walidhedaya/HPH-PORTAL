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

    // Validate role
    if (role !== "admin" && role !== "user") {
      return NextResponse.json(
        { error: "Invalid role value" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = db
      .prepare(`SELECT id FROM users WHERE tax_id = ?`)
      .get(cleanTaxId);

    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert user with selected role
    db.prepare(`
      INSERT INTO users (tax_id, password, role, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      cleanTaxId,
      hash,
      role,
      new Date().toISOString()
    );

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}