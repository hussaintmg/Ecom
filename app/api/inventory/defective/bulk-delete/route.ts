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
    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No defective item IDs provided" }, { status: 400 });
    }

    const result = await InventoryService.bulkDeleteDefective(ids);
    return NextResponse.json({
      message: `${result.deletedCount} defective record(s) deleted successfully`,
      ...result,
    });
  } catch (error: any) {
    console.error("Bulk delete defective error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete defective records" },
      { status: 500 }
    );
  }
}
