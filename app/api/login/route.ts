import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

type LoginBody = {
  tax_id: string;
  password: string;
};

export async function POST(req: Request) {
  try {
    const body: LoginBody = await req.json();

    const tax_id = String(body.tax_id).trim();
    const password = body.password;

    if (!tax_id || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    const result = await db.query(
      "SELECT * FROM users WHERE tax_id = $1",
      [tax_id]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 🔐 Create JWT token
    const token = createToken({
      id: user.id,
      tax_id: user.tax_id,
      role: user.role,
    });

    const res = NextResponse.json({
      success: true,
      tax_id: user.tax_id,
      role: user.role,
    });

    // 🔐 Secure cookie (works in localhost and production)
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return res;

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}