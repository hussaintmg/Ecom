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

export async function PUT(
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
    const body = await req.json();
    const { vendor, receiptNumber, origin, vendorContact, notes, receivedAt } = body;

    const receipt = await InventoryReceipt.findById(id);
    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Stock receipt not found" },
        { status: 404 }
      );
    }

    if (receiptNumber && receiptNumber.trim() !== receipt.receiptNumber) {
      const existing = await InventoryReceipt.findOne({
        receiptNumber: receiptNumber.trim(),
        _id: { $ne: receipt._id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "Receipt reference number already exists" },
          { status: 400 }
        );
      }
      receipt.receiptNumber = receiptNumber.trim();
    }

    if (vendor !== undefined) receipt.vendor = vendor.trim() || receipt.vendor;
    if (origin !== undefined) receipt.origin = origin.trim() || receipt.origin;
    if (vendorContact !== undefined) receipt.vendorContact = vendorContact.trim();
    if (notes !== undefined) receipt.notes = notes.trim();
    if (receivedAt) {
      const parsedDate = new Date(receivedAt);
      if (!isNaN(parsedDate.getTime())) {
        receipt.receivedAt = parsedDate;
      }
    }

    await receipt.save();

    return NextResponse.json({
      success: true,
      message: "Shipment details updated successfully",
      receipt,
    });
  } catch (error: any) {
    console.error("PUT /api/inventory/receipts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update receipt" },
      { status: 500 }
    );
  }
}
