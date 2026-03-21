import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { getUserFromRequest } from "@/utils/authHelpers";
import { hashPassword, comparePassword } from "@/utils/auth";
import { deleteFromCloudinary } from "@/utils/cloudinary";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const tokenPayload = getUserFromRequest(req);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(tokenPayload.id).select("-password -cart");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const tokenPayload = getUserFromRequest(req);
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, currentPassword, password, profileImage } = await req.json();

    const user = await User.findById(tokenPayload.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Update name
    if (name) user.name = name;

    // Update password if provided
    if (password && password.trim().length > 0) {
      if (!currentPassword) {
         return NextResponse.json({ error: "Current password is required to set a new password" }, { status: 400 });
      }
      const isMatch = await comparePassword(currentPassword, user.password);
      if (!isMatch) {
         return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }
      user.password = await hashPassword(password);
    }

    // Update Profile Image
    if (profileImage && profileImage.url) {
      // If user had an old profile image, delete it from cloudinary
      if (user.profileImage && user.profileImage.publicId) {
         if (user.profileImage.publicId !== profileImage.publicId) {
             await deleteFromCloudinary(user.profileImage.publicId, "image");
         }
      }
      user.profileImage = profileImage;
    }

    await user.save();

    return NextResponse.json({ message: "Settings updated", user: { name: user.name, email: user.email, profileImage: user.profileImage } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
