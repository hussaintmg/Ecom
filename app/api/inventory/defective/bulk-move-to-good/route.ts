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

    const result = await InventoryService.bulkMoveDefectiveToGood(
      {
        items: body.items,
        notes: body.notes,
      },
      user.id
    );

    return NextResponse.json({
      message: `${result.movedCount} defective item(s) moved to good sellable stock.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST bulk move defective to good error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to bulk move defective stock to good" },
      { status: 400 }
    );
  }
}
