import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import mongoose from "mongoose";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectDB();
    const user = getUserFromRequest(req);
    if (
      !user ||
      (user.role !== "Admin" &&
        user.role !== "Owner" &&
        user.role !== "admin" &&
        user.role !== "owner")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, paymentStatus } = await req.json();
    const { id } = await params;
    
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const prevStatus = order.status;

    if (status) {
      order.status = status;
      if (status === "delivered") order.deliveredAt = new Date();
      if (status === "shipped") order.shippedAt = new Date();
    }
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    // STOCK LOG LOGIC ON STATUS CHANGE
    const StockLog = mongoose.models.StockLog || mongoose.model("StockLog");
    const orderTag = `#${order._id.toString().slice(-8).toUpperCase()}`;

    // 1. If becoming DELIVERED -> Add permanent Delivered Log
    if (status === "delivered" && prevStatus !== "delivered") {
       for(const item of order.items) {
          const p = await Product.findById(item.product);
          await StockLog.create({
            product: item.product,
            change: 0, // Just a status log, stock already deducted at order time
            description: `Delivery Confirmed: ${orderTag}`,
            resultingStock: p?.stock || 0,
            performedBy: user.id || user._id
          });
       }
    }

    // 2. If reversing FROM delivered TO pending -> Cleanup/Notify
    if (prevStatus === "delivered" && status === "pending") {
        await StockLog.deleteMany({
            description: `Delivery Confirmed: ${orderTag}`
        });
    }

    return NextResponse.json({ message: "Order updated", order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await Order.findById(id)
      .populate("user")
      .populate("items.product");
    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Basic protection
    if (
      user.role === "user" &&
      order.user.toString() !== (user.id || user._id)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
