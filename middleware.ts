import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET as string;

export function middleware(req: NextRequest) {

  const token = req.cookies.get("auth_token")?.value;

  // if no token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {

    const decoded = jwt.verify(token, SECRET) as any;

    // protect admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {

      if (decoded.role !== "admin") {
        return NextResponse.redirect(new URL("/select-terminal", req.url));
      }

    }

    return NextResponse.next();

  } catch {

    return NextResponse.redirect(new URL("/login", req.url));

  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/import/:path*",
    "/export/:path*"
  ],
};