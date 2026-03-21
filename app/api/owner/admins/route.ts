import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || user.role !== "owner") {
      return NextResponse.json({ error: "Access denied", success: false }, { status: 403 });
    }
    const admins = await User.find({ role: "admin" });
    return NextResponse.json({ admins, success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || user.role !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const { id, status } = await req.json();
    const admin = await User.findByIdAndUpdate(id, { status }, { new: true });
    return NextResponse.json(admin);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
