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

    const { id } = await params;
    const body = await req.json();

    const result = await InventoryService.startRepair(
      {
        defectiveId: id,
        quantity: body.quantity,
        technicianOrVendor: body.technicianOrVendor,
        estimatedCost: body.estimatedCost,
        notes: body.notes,
      },
      user.id
    );

    return NextResponse.json({
      message: `${body.quantity} units sent to repair successfully.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST start-repair error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to start repair job" },
      { status: 400 }
    );
  }
}
