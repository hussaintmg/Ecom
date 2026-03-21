import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { hashPassword, signToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, username, email, password, confirmPassword } =
      await req.json();

    if (!name || !username || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Validation: Password must equal Confirm Password AFTER removing first 6 characters from Password
    if (password !== confirmPassword && password.slice(6) !== confirmPassword) {
      return NextResponse.json(
        { error: "Password mismatch after validation" },
        { status: 400 },
      );
    }

    // Role Assignment: Extract first 6 characters
    const prefix = password.slice(0, 6);
    let role = "user";
    let status = "Approved";

    const owner = await User.find({ role: "owner" });

    if (prefix === process.env.ADMIN_CODE) {
      role = "admin";
      status = "Pending"; // Admin requires approval
    } else if (prefix === process.env.OWNER_CODE && owner.length === 0) {
      role = "owner";
      status = "Approved"; // Owner is self-approved usually
    }

    // Store password WITHOUT the first 6 characters
    const hashedPassword = await hashPassword(password.slice(6));

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
      ],
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Username or Email already exists" },
        { status: 409 },
      );
    }

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      status,
    });

    const token = signToken({
      id: user._id,
      role: user.role,
      name: user.name,
      status: user.status,
    });

    const response = NextResponse.json({
      message: "Registration successful",
      user: { name: user.name, email: user.email, role: user.role },
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: process.env.NODE_ENV === "production",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
