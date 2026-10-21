import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import InventoryService from "@/services/inventoryService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one repair item must be provided for batch completion." },
        { status: 400 }
      );
    }

    const result = await InventoryService.completeRepairBatch(
      {
        repairInvoiceNo: body.repairInvoiceNo,
        items: body.items,
        notes: body.notes,
      },
      user.id
    );

    return NextResponse.json({
      message: `Repair batch completed successfully: ${result.totalSuccessCount} repaired, ${result.totalFailCount} failed.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST complete repair batch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to complete repair batch" },
      { status: 400 }
    );
  }
}
