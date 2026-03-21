import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { getUserFromRequest } from "@/utils/authHelpers";
import { comparePassword, hashPassword } from "@/utils/auth";
import { uploadToCloudinary } from "@/utils/cloudinary";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Access denied" }, { status: 401 });

    const fullUser = await User.findById(user.id || user._id).select("-password -forgotCode -forgotToken -resetToken");
    if (!fullUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(fullUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const authUser = getUserFromRequest(req);
    if (!authUser) return NextResponse.json({ error: "Access denied" }, { status: 401 });

    const user = await User.findById(authUser.id || authUser._id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const data = await req.json();
    const { name, phone, addressObj, deleteAddressId, updateAddress, profileImage, currentPassword, newPassword } = data;

    // Change Basic info
    if (name) user.name = name;
    if (phone) user.phone = phone;

    // Delete Address
    if (deleteAddressId) {
      user.addresses = user.addresses.filter((a: any) => a._id.toString() !== deleteAddressId);
    }

    // Update Address
    if (updateAddress) {
      if (updateAddress.isDefault) {
        user.addresses.forEach((a: any) => a.isDefault = false);
      }
      const addrIdx = user.addresses.findIndex((a: any) => a._id.toString() === updateAddress._id);
      if (addrIdx > -1) {
        user.addresses[addrIdx] = { ...user.addresses[addrIdx], ...updateAddress };
      }
    }

    // Add Address (Appends to existing array system)
    if (addressObj) {
      if(addressObj.isDefault) {
         user.addresses.forEach((a: any) => a.isDefault = false);
      }
      user.addresses.push(addressObj);
    }

    // Change Password logic
    if (currentPassword && newPassword) {
      const isMatch = await comparePassword(currentPassword, user.password);
      if (!isMatch) return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });
      user.password = await hashPassword(newPassword);
    }

    // Handle Profile Image Upload
    if (profileImage && profileImage.startsWith("data:")) {
      const cloud = await uploadToCloudinary(profileImage, "ecom/profiles", "image");
      if (cloud.url) {
        user.profileImage = { url: cloud.url, publicId: cloud.publicId };
      }
    }

    await user.save();
    return NextResponse.json({ message: "Profile updated successfully", user: { name: user.name, role: user.role, profileImage: user.profileImage } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
