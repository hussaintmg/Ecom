import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import StockLog from "@/models/StockLog";
import { deleteFromCloudinary } from "@/utils/cloudinary";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No product IDs provided" }, { status: 400 });
    }

    // Fetch all products that will be deleted
    const products = await Product.find({ _id: { $in: ids } });

    for (const product of products) {
      // 1. Delete images from Cloudinary (if any)
      for (const img of product.images || []) {
        if (img.publicId) {
          await deleteFromCloudinary(img.publicId, "image");
        }
      }
      // 2. Delete videos from Cloudinary (if any)
      for (const vid of product.videos || []) {
        if (vid.publicId) {
          await deleteFromCloudinary(vid.publicId, "video");
        }
      }

      // 3. Remove product from category's products array
      await Category.findByIdAndUpdate(product.category, {
        $pull: { products: product._id },
      });
    }

    // 4. Delete all stock logs for these products
    await StockLog.deleteMany({ product: { $in: ids } });

    // 5. Delete the products
    const result = await Product.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} products deleted successfully`,
    });
  } catch (error: any) {
    console.error("Bulk delete API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
