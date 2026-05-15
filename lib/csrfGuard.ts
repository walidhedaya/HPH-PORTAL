import { NextRequest, NextResponse } from "next/server";

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "").toLowerCase();
}

function configuredOrigins(req: NextRequest) {
  const values = [
    req.nextUrl.origin,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined,
    ...(process.env.CSRF_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter(Boolean) as string[];

  return new Set(values.map(normalizeOrigin));
}

function getHeaderOrigin(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function validateCsrfOrigin(req: NextRequest) {
  const allowedOrigins = configuredOrigins(req);
  const origin = getHeaderOrigin(req.headers.get("origin"));
  const referer = getHeaderOrigin(req.headers.get("referer"));
  const requestOrigin = origin || referer;

  if (!requestOrigin || !allowedOrigins.has(normalizeOrigin(requestOrigin))) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  return null;
}
