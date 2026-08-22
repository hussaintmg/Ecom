import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import StockLog from "@/models/StockLog";
import Product from "@/models/Product";
import { getUserFromRequest } from "@/utils/authHelpers";
import "@/models/User";

// GET: fetch all stock logs for a specific product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    await connectDB();
    const { productId } = await params;

    const logs = await StockLog.find({ product: productId })
      .sort({ createdAt: -1 })
      .populate("performedBy", "name email")
      .populate("revertedBy", "name email");

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH: undo a single stock entry of this product — body: { logId }.
 *
 * Nothing is deleted. The original entry stays in the history and a
 * compensating entry is written next to it, so the trail always explains why
 * the number moved. An entry can only be undone once, and an undo can never
 * push stock below zero.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { productId } = await params;
    const { logId } = await req.json();

    if (!logId) {
      return NextResponse.json({ error: "logId is required" }, { status: 400 });
    }

    const original = await StockLog.findOne({ _id: logId, product: productId });
    if (!original) {
      return NextResponse.json(
        { error: "Stock entry not found for this product" },
        { status: 404 }
      );
    }

    if (original.reverted) {
      return NextResponse.json(
        { error: "This entry has already been undone" },
        { status: 400 }
      );
    }

    if (original.reversalOf) {
      return NextResponse.json(
        { error: "A correction entry cannot be undone. Add a new adjustment instead." },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const delta = -original.change;
    const previousStock = product.stock;
    const newStock = previousStock + delta;

    if (newStock < 0) {
      return NextResponse.json(
        {
          error: `Cannot undo this entry — ${Math.abs(
            delta
          )} units would have to be removed but only ${previousStock} are left (some are already sold).`,
        },
        { status: 400 }
      );
    }

    product.stock = newStock;
    await product.save();

    await StockLog.create({
      product: original.product,
      change: delta,
      description: `Undo of "${original.description}" (${
        original.change > 0 ? "+" : ""
      }${original.change})`,
      previousStock,
      resultingStock: newStock,
      reversalOf: original._id,
      performedBy: user.id,
    });

    original.reverted = true;
    original.revertedAt = new Date();
    original.revertedBy = user.id;
    await original.save();

    return NextResponse.json({
      success: true,
      message: `Entry undone — stock is back to ${newStock}.`,
      resultingStock: newStock,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: delete all stock logs for a product
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    await connectDB();
    const { productId } = await params;

    await StockLog.deleteMany({ product: productId });
    return NextResponse.json({ message: "Stock logs deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
