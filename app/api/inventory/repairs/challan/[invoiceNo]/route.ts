import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import InventoryService from "@/services/inventoryService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { invoiceNo } = await params;
    if (!invoiceNo) {
      return NextResponse.json(
        { success: false, error: "Invoice/Challan number is required" },
        { status: 400 }
      );
    }

    const result = await InventoryService.getChallanByInvoiceNo(decodeURIComponent(invoiceNo));

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/repairs/challan error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch repair challan" },
      { status: 404 }
    );
  }
}
