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
    const result = await InventoryService.dispatchToRepairVendor(body, user.id);

    return NextResponse.json(
      {
        ...result,
        message: `Successfully dispatched to ${body.vendorName} with Challan #${result.repairInvoiceNo}.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/inventory/repairs/dispatch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch repair" },
      { status: 400 }
    );
  }
}
