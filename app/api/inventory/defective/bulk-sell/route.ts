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

    const result = await InventoryService.bulkSellDefective(
      {
        items: body.items,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        customerAddress: body.customerAddress,
        customerCity: body.customerCity,
        customerNote: body.customerNote,
        notes: body.notes,
      },
      user.id
    );

    return NextResponse.json({
      message: `Sold ${result.count} defective items as-is. Invoice #${result.invoice?._id?.toString().slice(-8).toUpperCase()} created.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST bulk sell defective error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to bulk sell defective stock" },
      { status: 400 }
    );
  }
}
