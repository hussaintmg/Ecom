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

    const result = await InventoryService.scrapDefective(
      {
        defectiveId: id,
        quantity: body.quantity,
        reason: body.reason,
        scrapRecoveryValue: body.scrapRecoveryValue,
        notes: body.notes,
      },
      user.id
    );

    return NextResponse.json({
      message: `${body.quantity} defective units scrapped.`,
      ...result,
    });
  } catch (error: any) {
    console.error("POST scrap defective error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to scrap defective stock" },
      { status: 400 }
    );
  }
}
