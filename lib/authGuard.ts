import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET as string;

export function verifyUser(req: NextRequest) {

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    return false;
  }

  try {

    jwt.verify(token, SECRET);
    return true;

  } catch {

    return false;

  }
}