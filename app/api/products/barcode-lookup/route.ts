import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Barcode code query parameter is required" },
        { status: 400 }
      );
    }

    // Build query to find by barcode or by MongoDB _id
    const conditions: any[] = [{ barcode: code }];
    if (mongoose.Types.ObjectId.isValid(code)) {
      conditions.push({ _id: code });
    }

    // Also case-insensitive match for barcode string
    conditions.push({ barcode: { $regex: `^${code}$`, $options: "i" } });

    const product = await Product.findOne({ $or: conditions })
      .populate("category", "name")
      .lean();

    if (!product) {
      return NextResponse.json(
        { success: false, message: `Product with barcode "${code}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        product,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Error looking up product by barcode:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to lookup barcode" },
      { status: 500 }
    );
  }
}
