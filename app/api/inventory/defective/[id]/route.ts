import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import DefectiveInventory from "@/models/DefectiveInventory";
import RepairJob from "@/models/RepairJob";
import StockLog from "@/models/StockLog";
import InventoryService from "@/services/inventoryService";
import "@/models/Product";
import "@/models/Category";
import "@/models/InventoryReceipt";
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

    const defective = await DefectiveInventory.findById(id)
      .populate({
        path: "product",
        select: "name price images stock category barcode",
        populate: { path: "category", select: "name" },
      })
      .populate("receipt", "receiptNumber receivedAt notes");

    if (!defective) {
      return NextResponse.json(
        { success: false, error: "Defective inventory record not found" },
        { status: 404 }
      );
    }

    // Repair jobs related to this defective batch
    const repairJobs = await RepairJob.find({ defectiveInventory: defective._id })
      .sort({ createdAt: -1 });

    // Stock movement logs related to this defective batch
    const history = await StockLog.find({ defectiveId: defective._id })
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      defective,
      repairJobs,
      history,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/defective/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch defective details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const result = await InventoryService.deleteDefective(id, user.id);

    return NextResponse.json({
      message: "Defective inventory record deleted successfully.",
      ...result,
    });
  } catch (error: any) {
    console.error("DELETE /api/inventory/defective/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete defective record" },
      { status: 400 }
    );
  }
}

