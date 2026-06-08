import connectDB from "@/utils/db";
import Product from "@/models/Product";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    // Build filter query
    const filter: any = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: `\\b${escapedSearch}`, $options: "i" };
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    // Get total stock sum
    const result = await Product.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stock" },
          productCount: { $sum: 1 },
        },
      },
    ]);

    const totalStock = result.length > 0 ? result[0].totalStock : 0;
    const productCount = result.length > 0 ? result[0].productCount : 0;

    return NextResponse.json({
      success: true,
      totalStock,
      productCount,
    });
  } catch (error) {
    console.error("Error fetching stock total:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stock total" },
      { status: 500 }
    );
  }
}
