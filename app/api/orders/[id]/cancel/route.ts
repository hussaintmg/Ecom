import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/utils/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import mongoose from "mongoose";
import { getUserFromRequest } from "@/utils/authHelpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia" as any,
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const order = await Order.findById(id);
    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // 1. Authorization: Only the owner of the order or Admin can cancel
    const isOwner = order.user.toString() === (user.id || user._id);
    const isAdmin = ["admin", "owner"].includes(user.role?.toLowerCase());

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 },
      );
    }

    // 2. Cancellation Logic check (Cannot cancel if already shipped/delivered)
    if (["shipped", "delivered", "cancelled"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot cancel order in ${order.status} state` },
        { status: 400 },
      );
    }

    // 3. Handle Automated Stripe Refund
    let refundInfo = null;
    if (
      order.paymentMethod === "Stripe" &&
      order.paymentStatus === "paid" &&
      order.paymentId !== "N/A"
    ) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.paymentId,
        });
        refundInfo = { refundId: refund.id, status: refund.status };
        order.paymentStatus = "failed"; // Marking as failed/refunded in our system
      } catch (stripeErr: any) {
        console.error("Stripe Refund Error:", stripeErr);
        return NextResponse.json(
          { error: "Cancellation failed: Unable to process Stripe refund." },
          { status: 500 },
        );
      }
    }

    // 4. Update Order Status
    order.status = "cancelled";
    await order.save();

    // 5. Restock Products
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    // 6. Log to StockLog
    const StockLog = mongoose.models.StockLog || mongoose.model("StockLog");
    const orderTag = `#${order._id.toString().slice(-8).toUpperCase()}`;
    for (const item of order.items) {
      const p = await Product.findById(item.product);
      await StockLog.create({
        product: item.product,
        change: item.quantity,
        description: `Order Cancelled (Restocked): ${orderTag}`,
        resultingStock: p?.stock || 0,
        performedBy: user.id || user._id,
      });
    }

    return NextResponse.json({
      message: "Order cancelled and restocked successfully",
      refund: refundInfo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
