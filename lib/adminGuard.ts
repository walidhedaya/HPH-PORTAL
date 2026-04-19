import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// ===============================
// 🔐 SECRET
// ===============================
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("CRITICAL: JWT_SECRET is not defined!");
}

const secret = new TextEncoder().encode(SECRET);

// ===============================
type AdminPayload = {
  id: number;
  role: "admin" | "super_admin";
};

// ===============================
export async function verifyAdmin(req: NextRequest): Promise<AdminPayload | null> {
  try {
    const token = req.cookies.get("auth_token")?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, secret);

    const user = payload as AdminPayload;

    if (user.role !== "admin" && user.role !== "super_admin") {
      return null;
    }

    return user;

  } catch (err) {
    console.error("ADMIN TOKEN ERROR:", err);
    return null;
  }
}