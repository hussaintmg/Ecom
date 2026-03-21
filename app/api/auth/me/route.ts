import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/utils/authHelpers";
import { signToken } from "@/utils/auth";
import connectDB from "@/utils/db";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    // Decode the existing token
    const tokenPayload = getUserFromRequest(req) as any;
    if (!tokenPayload)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch fresh data from DB
    await connectDB();
    const dbUser = await User.findById(tokenPayload.id).select(
      "-password -forgotToken -forgotCode -resetToken -tokenExpires",
    );

    if (!dbUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const response = NextResponse.json({ user: dbUser });

    // Compare: if role, status or name has changed in DB vs token → issue new token
    const hasChanged =
      tokenPayload.role !== dbUser.role ||
      tokenPayload.status !== dbUser.status ||
      tokenPayload.name !== dbUser.name;

    if (hasChanged) {
      const newToken = signToken({
        id: dbUser._id,
        role: dbUser.role,
        status: dbUser.status,
        name: dbUser.name,
      });

      // Set the refreshed token as cookie (preserve original settings)
      response.cookies.set({
        name: "auth_token",
        value: newToken,
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
