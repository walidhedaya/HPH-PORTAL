import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// 🔐 Load SECRET
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("CRITICAL: JWT_SECRET is not defined!");
}

// 👇 الحل هنا
const JWT_SECRET: string = SECRET;

// ===============================
type AdminPayload = {
  id: number;
  role: "admin" | "super_admin";
};

export function verifyAdmin(req: NextRequest): AdminPayload | null {

  const token = req.cookies.get("auth_token")?.value;

  if (!token) return null;

  try {

    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload;

    if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return null;
    }

    return decoded;

  } catch (err) {
    console.error("ADMIN TOKEN ERROR:", err);
    return null;
  }
}