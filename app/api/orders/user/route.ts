import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Order from "@/models/Order";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orders = await Order.find({ user: user.id }).sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
