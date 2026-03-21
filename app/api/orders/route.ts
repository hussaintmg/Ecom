import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Cart from "@/models/Cart";
import { getUserFromRequest } from "@/utils/authHelpers";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const reqData = await req.json();
    const { items, itemsPrice, shippingPrice, totalPrice, shippingAddress, paymentMethod, paymentId, cartId } = reqData;

    // 1. Check stock for all items
    for (const item of items) {
       // Ensure product object exists
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json({ error: `Product not found - ID: ${item.product}` }, { status: 404 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for ${product.name}` 
        }, { status: 400 });
      }
    }

    // 2. Create order
    const order = await Order.create({
      user: user.id || user._id,
      items,
      itemsPrice,
      shippingPrice,
      totalPrice,
      shippingAddress,
      paymentMethod,
      paymentId: paymentId || "N/A",
      status: "pending",
      paymentStatus: paymentMethod === "COD" ? "pending" : "paid", 
    });

    // 3. Update stock and cleanup cart + Invoice for Stripe
    // Using explicit model retrieval to prevent registration conflicts
    const Invoice = mongoose.models.Invoice || mongoose.model("Invoice");
    const StockLog = mongoose.models.StockLog || mongoose.model("StockLog");

    for (const item of items) {
      const p = await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } }, { new: true });
      if (!p) continue;

      // Stock log for initial order
      await StockLog.create({
        product: item.product,
        change: -item.quantity,
        description: `Order Placed (#${order._id.toString().slice(-8).toUpperCase()})`,
        resultingStock: p.stock,
        performedBy: user.id || user._id
      });

      // Automated Invoice for Stripe (Prepaid)
      if (paymentMethod !== "COD") {
        await Invoice.create({
          product: item.product,
          category: p.category, // Category ID from Product
          quantity: item.quantity,
          salePrice: item.price,
          description: `Stripe Payment Verified - #${order._id.toString().slice(-8).toUpperCase()}`,
          soldBy: user.id || user._id
        });
      }
    }

    if (cartId) {
       try {
         await Cart.findByIdAndUpdate(cartId, { status: "converted" });
       } catch (err) {
         console.warn("Cart update deferred/failed:", cartId);
       }
    }

    return NextResponse.json({ message: "Order placed successfully", order });
  } catch (error: any) {
    console.error("Order Creation Error Detail:", error.message, error.stack);
    return NextResponse.json({ error: error.message || "Failed to place order" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = {};
    const userRole = user.role?.toLowerCase();
    if (userRole === "user") {
      query = { user: user.id || user._id };
    } else if (userRole !== "admin" && userRole !== "owner") {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await Order.find(query).populate("user").sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
