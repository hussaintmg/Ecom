import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import StockLog from "@/models/StockLog";

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
      .populate("performedBy", "name email");

    return NextResponse.json(logs);
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
