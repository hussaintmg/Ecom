import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import InventoryService from "@/services/inventoryService";

export const dynamic = "force-dynamic";

export async function GET(
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
    const breakdown = await InventoryService.getProductStockBreakdown(id);

    if (!breakdown) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      breakdown,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/products/[id]/summary error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch product stock summary" },
      { status: 500 }
    );
  }
}
