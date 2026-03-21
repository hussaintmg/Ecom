import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyToken } from "@/utils/auth";
import connectDB from "@/utils/db";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const payload: any = verifyToken(token);
    
    if (!payload || !payload.email || !payload.resetToken) {
      return NextResponse.json({ error: "Invalid or corrupted token" }, { status: 401 });
    }

    const user = await User.findOne({
      email: payload.email,
      resetToken: payload.resetToken,
      tokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 401 });
    }

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    user.resetToken = null;
    user.tokenExpires = null;
    await user.save();

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
