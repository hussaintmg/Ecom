import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import InventoryService from "@/services/inventoryService";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id: repairJobId } = await params;
    const body = await req.json();

    const result = await InventoryService.completeRepair(
      {
        repairJobId,
        successfulQty: body.successfulQty,
        failedQty: body.failedQty,
        actualCost: body.actualCost,
        notes: body.notes,
      },
      user.id
    );

    return NextResponse.json({
      message: `Repair completed: ${body.successfulQty || 0} successfully repaired, ${body.failedQty || 0} failed.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST complete repair error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to complete repair" },
      { status: 400 }
    );
  }
}
