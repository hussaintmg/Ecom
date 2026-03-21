import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/utils/db";
import User from "@/models/User";
import nodemailer from "nodemailer";
import { signToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { loginId } = await req.json();

    if (!loginId)
      return NextResponse.json(
        { error: "Missing login identifier" },
        { status: 400 },
      );

    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { username: loginId.toLowerCase() },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const forgotCode = Math.floor(100000 + Math.random() * 900000).toString();
    const forgotToken = crypto.randomBytes(32).toString("hex");

    user.forgotCode = forgotCode;
    user.forgotToken = forgotToken;
    user.tokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await user.save();

    const token = signToken({
      email: user.email,
      forgotToken: user.forgotToken,
    });

    // Nodemailer setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"ECOM Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your Password Reset Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your account. Please use the following 6-digit verification code to proceed:</p>
          <div style="font-size: 32px; font-weight: bold; color: #0070f3; letter-spacing: 5px; margin: 20px 0;">
            ${forgotCode}
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">Modern ECOM - Full Stack Experience</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      message: "Reset details generated and email sent",
      token,
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
