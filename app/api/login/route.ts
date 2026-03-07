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

    // 🔐 create JWT token
    const token = createToken({
      id: user.id,
      tax_id: user.tax_id,
      role: user.role
    });

    const res = NextResponse.json({
      success: true,
      tax_id: user.tax_id,
      role: user.role,
    });

    // 🔐 store token in HttpOnly cookie
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8
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