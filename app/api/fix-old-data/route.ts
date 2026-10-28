import { NextRequest, NextResponse } from "next/server";
import InventoryService from "@/services/inventoryService";

export const dynamic = "force-dynamic";

/**
 * Public GET API: /api/fix-old-data
 * - Does NOT require authentication.
 * - Call once via browser or curl to sanitize all legacy data:
 *   1. Cleans old "Sold As-Is (Defective Inventory): ..." cluttered descriptions on sales invoices.
 *   2. Generates/synchronizes missing completion vouchers (-CMP) for completed repair challans.
 *   3. Initializes missing problemDescription, workDone, and completionNotes fields on repair jobs.
 *   4. Reconciles defective inventory quantities and statuses.
 */
export async function GET(req: NextRequest) {
  try {
    const result = await InventoryService.fixOldDataAndSync();

    return NextResponse.json({
      ...result,
      message: "Purana data kamiyabi se fix aur synchronize ho gaya hai! (All legacy data successfully cleaned and synchronized)",
    });
  } catch (error: any) {
    console.error("GET /api/fix-old-data error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fix old data",
      },
      { status: 500 }
    );
  }
}
