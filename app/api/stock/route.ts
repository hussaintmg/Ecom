import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import StockLog from "@/models/StockLog";
import Product from "@/models/Product";
import { getUserFromRequest } from "@/utils/authHelpers";

// POST: add a stock log entry and update product stock
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { productId, change, description } = await req.json();

    if (!productId || change === undefined || !description) {
      return NextResponse.json(
        { error: "productId, change, and description are required" },
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

    const newStock = product.stock + change;
    if (newStock < 0) {
      return NextResponse.json(
        { error: "Stock cannot go below 0" },
        { status: 400 }
      );
    }

    product.stock = newStock;
    await product.save();

    const log = await StockLog.create({
      product: productId,
      change,
      description,
      resultingStock: newStock,
      performedBy: user.id,
    });

    return NextResponse.json(log);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
