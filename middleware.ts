import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = process.env.JWT_SECRET;

export async function middleware(req: NextRequest) {
  try {
    // ===============================
    // ONLY PROTECT ADMIN
    // ===============================
    if (!req.nextUrl.pathname.startsWith("/admin")) {
      return NextResponse.next();
    }

    if (!SECRET) {
      console.error("JWT_SECRET missing");
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // ===============================
    // GET TOKEN
    // ===============================
    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // ===============================
    // VERIFY TOKEN (JOSE)
    // ===============================
    const secret = new TextEncoder().encode(SECRET);

    let payload: any;

    try {
      const result = await jwtVerify(token, secret);
      payload = result.payload;
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // ===============================
    // ROLE CHECK
    // ===============================
    if (payload.role !== "admin" && payload.role !== "super_admin") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();

  } catch (err) {
    console.error("MIDDLEWARE ERROR:", err);

    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// ===============================
export const config = {
  matcher: ["/admin/:path*"],
};