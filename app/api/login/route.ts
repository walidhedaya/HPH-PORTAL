import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";
import { clearLoginAttempts, isRateLimited } from "@/lib/loginThrottle";

type LoginBody = {
  tax_id: string;
  password: string;
};

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getLoginKey(req: NextRequest, taxId: string) {
  return `${getClientIp(req)}:${taxId.toLowerCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: LoginBody = await req.json();

    const tax_id = String(body.tax_id || "").trim();
    const password = String(body.password || "");

    // ===============================
    // VALIDATION
    // ===============================
    if (!tax_id || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    const loginKey = getLoginKey(req, tax_id);

    if (await isRateLimited(loginKey)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    // ===============================
    // GET USER
    // ===============================
    const result = await db.query(
      `
      SELECT id, tax_id, password, role, full_access, COALESCE(is_blocked, false) AS is_blocked
      FROM users
      WHERE LOWER(tax_id) = LOWER($1)
      LIMIT 1
      `,
      [tax_id]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ===============================
    // PASSWORD CHECK
    // ===============================
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.is_blocked) {
      return NextResponse.json(
        { error: "User is blocked" },
        { status: 403 }
      );
    }

    await clearLoginAttempts(loginKey);

    // ===============================
    // 🔐 CREATE TOKEN (FIXED)
    // ===============================
    const token = createToken({
      id: user.id,
      tax_id: user.tax_id,
      role: user.role,
      full_access: user.full_access || false, // ✅ FIX
    });

    // ===============================
    // RESPONSE
    // ===============================
    const res = NextResponse.json({
      success: true,
      tax_id: user.tax_id,
      role: user.role,
      full_access: user.full_access || false,
    });

    // ===============================
    // COOKIE
    // ===============================
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
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
