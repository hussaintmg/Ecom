import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { verifyToken } from "@/utils/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const jwtToken = searchParams.get("token");
    if (!jwtToken) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    const type = searchParams.get("type");
    const payload: any = verifyToken(jwtToken);

    if (!payload || !payload.email) {
      return NextResponse.json({ error: "Invalid or corrupted token" }, { status: 401 });
    }

    const query: any = {
      email: payload.email,
      tokenExpires: { $gt: Date.now() },
    };

    let tokenToReturn = "";

    // Explicitly check for 'reset' type
    if (type === "reset") {
      if (!payload.resetToken) {
        return NextResponse.json({ error: "Payload missing resetToken" }, { status: 401 });
      }
      query.resetToken = payload.resetToken;
      tokenToReturn = payload.resetToken;
    } else {
      // Default to 'forgot' type (handles 'forgot' and and the 'forogt' typo)
      if (!payload.forgotToken) {
        return NextResponse.json({ error: "Payload missing forgotToken" }, { status: 401 });
      }
      query.forgotToken = payload.forgotToken;
      tokenToReturn = payload.forgotToken;
    }

    const user = await User.findOne(query);

    if (!user) {
      return NextResponse.json(
        { error: "Session expired or invalid token" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
      token: tokenToReturn
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
