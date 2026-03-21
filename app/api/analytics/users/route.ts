import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import User from "@/models/User";
import Order from "@/models/Order";
import Invoice from "@/models/Invoice"; // Though users don't directly buy via invoices, owner might want to see who bought
import { getUserFromRequest } from "@/utils/authHelpers";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getUserFromRequest(req);
    // Secure to owner
    if (!admin || admin.role !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch users (role: user)
    const users = await User.find({ role: "user" })
      .select("-password")
      .populate("cart.product", "name price images stock");

    // Enhance with orders
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const orders = await Order.find({ user: user._id })
          .populate("items.product", "name price images")
          .sort({ createdAt: -1 });
        
        return {
          ...user.toObject(),
          totalOrders: orders.length,
          orders,
          totalSpent: orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0)
        };
      })
    );

    return NextResponse.json(enrichedUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
