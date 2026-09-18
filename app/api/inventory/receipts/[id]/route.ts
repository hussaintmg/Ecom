import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import InventoryReceipt from "@/models/InventoryReceipt";
import StockLog from "@/models/StockLog";
import "@/models/Product";
import "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    const receipt = await InventoryReceipt.findById(id)
      .populate("items.product", "name price images stock category barcode")
      .populate("receivedBy", "name email role");

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Stock receipt not found" },
        { status: 404 }
      );
    }

    // Fetch related stock movement history for this receipt
    const history = await StockLog.find({ receiptId: receipt._id })
      .populate("performedBy", "name email")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      receipt,
      history,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/receipts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch receipt details" },
      { status: 500 }
    );
  }
}
