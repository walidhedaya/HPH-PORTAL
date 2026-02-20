import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

type LoginBody = {
  tax_id: string;
  password: string;
};

type User = {
  tax_id: string;
  password: string;
  role: string;
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

    const user = db
      .prepare("SELECT * FROM users WHERE tax_id = ?")
      .get(tax_id) as User | undefined;

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

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}