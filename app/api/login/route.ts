import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { tax_id, password } = await req.json();

    if (!tax_id || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    const user = db
      .prepare(`SELECT * FROM users WHERE tax_id = ?`)
      .get(tax_id);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = bcrypt.compareSync(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      tax_id: user.tax_id,
      role: user.role,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
