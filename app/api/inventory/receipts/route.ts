import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import InventoryReceipt from "@/models/InventoryReceipt";
import InventoryService from "@/services/inventoryService";
import Product from "@/models/Product";
import "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 10)));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "All";
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status && status !== "All") {
      query.status = status;
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchingProductIds = await Product.find({
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { description: { $regex: escaped, $options: "i" } },
          { barcode: { $regex: escaped, $options: "i" } },
        ],
      }).select("_id");

      query.$or = [
        { receiptNumber: { $regex: escaped, $options: "i" } },
        { vendor: { $regex: escaped, $options: "i" } },
        { origin: { $regex: escaped, $options: "i" } },
        { notes: { $regex: escaped, $options: "i" } },
        { "items.product": { $in: matchingProductIds.map((p) => p._id) } },
      ];
    }

    const totalReceipts = await InventoryReceipt.countDocuments(query);
    const totalPages = Math.ceil(totalReceipts / limit) || 1;

    const receipts = await InventoryReceipt.find(query)
      .populate("items.product", "name price images stock category barcode")
      .populate("receivedBy", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Compute top-level summary counts
    const summaryAgg = await InventoryReceipt.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalReceived: { $sum: "$items.qtyReceived" },
          totalPending: { $sum: "$items.qtyPending" },
          totalGood: { $sum: "$items.qtyGood" },
          totalDefective: { $sum: "$items.qtyDefective" },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      totalReceived: 0,
      totalPending: 0,
      totalGood: 0,
      totalDefective: 0,
    };

    return NextResponse.json({
      success: true,
      receipts,
      totalReceipts,
      totalPages,
      currentPage: page,
      summary,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/receipts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stock receipts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const receipt = await InventoryService.receiveStock(body, user.id);

    return NextResponse.json(
      {
        success: true,
        message: `Shipment ${receipt.receiptNumber} received into Pending Inspection.`,
        receipt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/inventory/receipts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to receive stock" },
      { status: 400 }
    );
  }
}
