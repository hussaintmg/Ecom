import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import RepairJob from "@/models/RepairJob";
import "@/models/Product";
import "@/models/DefectiveInventory";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const repairJob = await RepairJob.findById(id)
      .populate("product", "name price images stock")
      .populate("defectiveInventory", "defectReason description quantity availableDefectiveQuantity");

    if (!repairJob) {
      return NextResponse.json({ success: false, error: "Repair job not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      repairJob,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/repairs/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch repair job" },
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
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const repairJob = await RepairJob.findById(id);
    if (!repairJob) {
      return NextResponse.json({ success: false, error: "Repair job not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      technicianOrVendor,
      vendorPhone,
      vendorAddress,
      expectedReturnDate,
      estimatedCost,
      problemDescription,
      notes,
      customerName,
      customerPhone,
      customerAddress,
    } = body;

    if (technicianOrVendor !== undefined) repairJob.technicianOrVendor = technicianOrVendor.trim();
    if (vendorPhone !== undefined) repairJob.vendorPhone = vendorPhone.trim();
    if (vendorAddress !== undefined) repairJob.vendorAddress = vendorAddress.trim();
    if (expectedReturnDate !== undefined) repairJob.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
    if (estimatedCost !== undefined) repairJob.estimatedCost = Number(estimatedCost) || 0;
    if (problemDescription !== undefined) repairJob.problemDescription = problemDescription.trim();
    if (notes !== undefined) repairJob.notes = notes.trim();
    if (customerName !== undefined) repairJob.customerName = customerName.trim();
    if (customerPhone !== undefined) repairJob.customerPhone = customerPhone.trim();
    if (customerAddress !== undefined) repairJob.customerAddress = customerAddress.trim();

    await repairJob.save();

    const populated = await RepairJob.findById(repairJob._id)
      .populate("product", "name price images stock")
      .populate("defectiveInventory", "defectReason description quantity availableDefectiveQuantity");

    return NextResponse.json({
      success: true,
      message: "Repair job updated successfully",
      repairJob: populated,
    });
  } catch (error: any) {
    console.error("PUT /api/inventory/repairs/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update repair job" },
      { status: 500 }
    );
  }
}
