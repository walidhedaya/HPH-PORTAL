import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = process.env.JWT_SECRET;

const protectedUserPaths = [
  "/select-terminal",
  "/select-service",
  "/import",
  "/export",
];

function isProtectedUserPath(pathname: string) {
  return protectedUserPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function middleware(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const isAdminPath = pathname.startsWith("/admin");
    const isUserPath = isProtectedUserPath(pathname);

    if (!isAdminPath && !isUserPath) {
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
    if (!payload.role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (
      isAdminPath &&
      payload.role !== "admin" &&
      payload.role !== "super_admin"
    ) {
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
  matcher: [
    "/admin/:path*",
    "/select-terminal",
    "/select-service",
    "/import",
    "/import/:path*",
    "/export",
    "/export/:path*",
  ],
};
