import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import InventoryService from "@/services/inventoryService";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id: receiptId, itemId } = await params;
    const body = await req.json();

    const result = await InventoryService.markGood(
      {
        receiptId,
        itemId,
        quantity: body.quantity,
        notes: body.notes,
      },
      user.id
    );

    return NextResponse.json({
      message: `Marked ${body.quantity} units as Good. Sellable stock updated.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST mark-good error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark item as good" },
      { status: 400 }
    );
  }
}
