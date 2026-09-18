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

    const result = await InventoryService.bulkRepairDefective(
      {
        items: body.items,
      },
      user.id
    );

    return NextResponse.json({
      message: `${result.repairedCount} defective item(s) sent to repair successfully.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST bulk repair defective error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send defective stock to repair" },
      { status: 400 }
    );
  }
}
