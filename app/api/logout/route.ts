import { NextRequest, NextResponse } from "next/server";
import { validateCsrfOrigin } from "@/lib/csrfGuard";

export async function POST(req: NextRequest) {
  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  const res = NextResponse.json({ success: true });

  res.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0), // delete cookie
  });

  return res;
}
