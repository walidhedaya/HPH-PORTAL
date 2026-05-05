import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET as string;

if (!SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

// ===============================
// 🔐 TYPE (FIXED)
// ===============================
export type AuthUser = {
  id: number;
  tax_id: string;
  role: "user" | "admin" | "super_admin";
  full_access?: boolean; // ✅ ADD THIS
};

// ===============================
// 🔐 CREATE TOKEN (FIXED)
// ===============================
export function createToken(user: AuthUser) {
  return jwt.sign(
    {
      id: user.id,
      tax_id: user.tax_id,
      role: user.role,
      full_access: user.full_access || false, // ✅ ADD THIS
    },
    SECRET,
    {
      expiresIn: "8h",
    }
  );
}

// ===============================
// 🔐 VERIFY TOKEN
// ===============================
export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, SECRET) as AuthUser;
  } catch {
    return null;
  }
}