import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {

  const token = req.cookies.get("auth_token")?.value;
  const { pathname } = req.nextUrl;

  // protect admin routes
  if (pathname.startsWith("/admin")) {

    if (!token) {

      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);

      return NextResponse.redirect(loginUrl);
    }

  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*"
  ],
};
