import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Invoice from "@/models/Invoice";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const product = searchParams.get("product");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query: any = {};
    if (product) query.product = product;
    if (category) query.category = category;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        // To include the whole end date, set to next day parsing
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(query)
      .populate("product", "name price images stock")
      .populate("category", "name")
      .populate("soldBy", "name email role")
      .sort({ createdAt: -1 });

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    // Allow admins and owners
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { productId, quantity, salePrice, description } = await req.json();

    if (!productId || !quantity || !salePrice || !description) {
      return NextResponse.json(
        { error: "Product, quantity, sale price, and description are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Sell quantity must be positive" },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock! Only ${product.stock} available.` },
        { status: 400 }
      );
    }

    // Process logic correctly:
    // 1. Reduce stock
    const newStock = product.stock - quantity;
    product.stock = newStock;
    await product.save();

    // 2. Add StockLog
    await StockLog.create({
      product: product._id,
      change: -quantity,
      description: `Manual Sell: ${description}`,
      resultingStock: newStock,
      performedBy: user.id,
    });

    // 3. Create Invoice
    const invoice = await Invoice.create({
      product: product._id,
      category: product.category,
      quantity,
      salePrice,
      description,
      soldBy: user.id,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
