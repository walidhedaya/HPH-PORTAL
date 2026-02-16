import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { tax_id, password } = await req.json();

    if (!tax_id || !password) {
      return NextResponse.json(
        { error: "Missing tax_id or password" },
        { status: 400 }
      );
    }

    // تحقق إن المستخدم مش موجود
    const existing = db
      .prepare(`SELECT id FROM users WHERE tax_id = ?`)
      .get(tax_id);

    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // تشفير كلمة المرور
    const hash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (tax_id, password_hash, role, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      tax_id,
      hash,
      "user",
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
