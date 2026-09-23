import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import DefectiveInventory from "@/models/DefectiveInventory";
import Product from "@/models/Product";
import "@/models/Category";
import "@/models/InventoryReceipt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 10)));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "All";
    const defectReason = searchParams.get("defectReason")?.trim() || "All";
    const hasAvailable = searchParams.get("hasAvailable");
    const hasRepairing = searchParams.get("hasRepairing");
    const skip = (page - 1) * limit;

    const query: any = {};

    if (status && status !== "All") {
      query.status = status;
    }
    if (defectReason && defectReason !== "All") {
      query.defectReason = defectReason;
    }
    if (hasAvailable === "true") {
      query.availableDefectiveQuantity = { $gt: 0 };
    }
    if (hasRepairing === "true") {
      query.quantityRepairing = { $gt: 0 };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchedProducts = await Product.find({
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { barcode: { $regex: escaped, $options: "i" } },
        ],
      }).select("_id");
      const productIds = matchedProducts.map((p) => p._id);

      query.$or = [
        { product: { $in: productIds } },
        { description: { $regex: escaped, $options: "i" } },
        { defectReason: { $regex: escaped, $options: "i" } },
      ];
    }

    const totalRecords = await DefectiveInventory.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const defectiveList = await DefectiveInventory.find(query)
      .populate({
        path: "product",
        select: "name price images stock category barcode",
        populate: { path: "category", select: "name" },
      })
      .populate("receipt", "receiptNumber receivedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalAllRecords = await DefectiveInventory.countDocuments({});

    // Compute summary totals across all defective stock
    const summaryAgg = await DefectiveInventory.aggregate([
      {
        $group: {
          _id: null,
          totalAvailable: { $sum: "$availableDefectiveQuantity" },
          totalRepairing: { $sum: "$quantityRepairing" },
          totalSold: { $sum: "$quantitySold" },
          totalScrapped: { $sum: "$quantityScrapped" },
          totalRepairCostSpent: { $sum: "$repairCostSpent" },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      totalAvailable: 0,
      totalRepairing: 0,
      totalSold: 0,
      totalScrapped: 0,
      totalRepairCostSpent: 0,
    };

    let filteredSummary = summary;
    const hasFilters =
      Boolean(status && status !== "All") ||
      Boolean(defectReason && defectReason !== "All") ||
      Boolean(hasAvailable === "true") ||
      Boolean(hasRepairing === "true") ||
      Boolean(search);

    if (hasFilters) {
      const filteredAgg = await DefectiveInventory.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAvailable: { $sum: "$availableDefectiveQuantity" },
            totalRepairing: { $sum: "$quantityRepairing" },
            totalSold: { $sum: "$quantitySold" },
            totalScrapped: { $sum: "$quantityScrapped" },
            totalRepairCostSpent: { $sum: "$repairCostSpent" },
          },
        },
      ]);
      filteredSummary = filteredAgg[0] || {
        totalAvailable: 0,
        totalRepairing: 0,
        totalSold: 0,
        totalScrapped: 0,
        totalRepairCostSpent: 0,
      };
    }

    return NextResponse.json({
      success: true,
      defectiveList,
      totalRecords,
      totalAllRecords,
      totalPages,
      currentPage: page,
      summary,
      filteredSummary,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/defective error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch defective inventory" },
      { status: 500 }
    );
  }
}
