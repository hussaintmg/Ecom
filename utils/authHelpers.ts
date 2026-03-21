import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";

export const getUserFromRequest = (req: NextRequest) => {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token) as any;
};

export const roleCheck = (req: NextRequest, allowedRoles: string[]) => {
  const user = getUserFromRequest(req);
  if (!user) return false;
  return allowedRoles.includes(user.role);
};
