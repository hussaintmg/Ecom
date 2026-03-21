import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { signToken, verifyToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { tokenParam, token, code } = await req.json();

    if (!token || !code)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const payload: any = verifyToken(tokenParam);

    if (!payload || !payload.email || !payload.forgotToken) {
      return NextResponse.json(
        { error: "Invalid or corrupted token" },
        { status: 401 },
      );
    }

    if(payload.forgotToken !== token){
      return NextResponse.json(
        { error: "Invalid or corrupted token" },
        { status: 401 },
      );
    }

    const user = await User.findOne({
      email: payload.email,
      forgotToken: payload.forgotToken,
      forgotCode: code,
      tokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid code or token" },
        { status: 400 },
      );
    }

    // Code correct: Delete ALL forgot tokens + codes
    user.forgotToken = null;
    user.forgotCode = null;

    // Generate RESET TOKEN
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.tokenExpires = Date.now() + 10 * 60 * 1000; // 10 more minutes
    await user.save();

    const jwtToken = signToken({ email: user.email, resetToken });

    return NextResponse.json({
      success: true,
      resetToken: jwtToken,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
