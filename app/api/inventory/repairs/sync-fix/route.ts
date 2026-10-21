import { NextRequest, NextResponse } from "next/server";
import InventoryService from "@/services/inventoryService";

export const dynamic = "force-dynamic";

/**
 * Public GET API endpoint to verify and synchronize legacy repair and defective documents.
 * - Publicly callable via standard GET request (browser or webhook)
 * - Safe: Does NOT expose sensitive customer details or secrets
 * - Reconciles missing challan invoice numbers, repair invoices, and defective inventory counts
 */
export async function GET(req: NextRequest) {
  try {
    const result = await InventoryService.syncAndFixRepairData();

    return NextResponse.json({
      success: true,
      message: "Repair and defective inventory data integrity verified and synchronized successfully.",
      stats: result.stats,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/repairs/sync-fix error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to synchronize repair data",
      },
      { status: 500 }
    );
  }
}
