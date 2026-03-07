import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET as string;

export type AuthUser = {
  id: number;
  tax_id: string;
  role: string;
};

export function createToken(user: AuthUser) {

  return jwt.sign(
    {
      id: user.id,
      tax_id: user.tax_id,
      role: user.role
    },
    SECRET,
    {
      expiresIn: "8h"
    }
  );

}

export function verifyToken(token: string) {

  try {

    return jwt.verify(token, SECRET) as AuthUser;

  } catch {

    return null;

  }

}