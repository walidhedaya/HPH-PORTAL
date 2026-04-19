import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// ===============================
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("CRITICAL: JWT_SECRET is not defined!");
}

const secret = new TextEncoder().encode(SECRET);

// ===============================
type UserPayload = {
  id: number;
  role: "user" | "admin" | "super_admin";
  full_access?: boolean;
};

// ===============================
export async function verifyUser(req: NextRequest): Promise<UserPayload | null> {
  try {
    const token = req.cookies.get("auth_token")?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, secret);

    const user = payload as UserPayload;

    // allow all roles
    if (!user.role) return null;

    return user;

  } catch (err) {
    console.error("USER TOKEN ERROR:", err);
    return null;
  }
}