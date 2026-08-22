import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import StockLog from "@/models/StockLog";
import { deleteFromCloudinary } from "@/utils/cloudinary";
import { getUserFromRequest } from "@/utils/authHelpers";
import { MAX_STOCK_CHANGE } from "@/constants/stock";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id).populate("category");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json(); // data does NOT contain price

    const oldProduct = await Product.findById(id);
    if (!oldProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // If category changed, update both old and new category's products array
    if (
      data.category &&
      oldProduct.category.toString() !== data.category.toString()
    ) {
      await Category.findByIdAndUpdate(oldProduct.category, {
        $pull: { products: oldProduct._id },
      });
      await Category.findByIdAndUpdate(data.category, {
        $addToSet: { products: oldProduct._id },
      });
    }

    // Editing a product can also move its stock. Validate it like any other
    // stock change, and write a StockLog so the movement shows up in the
    // history — and can be undone from there if the number was wrong.
    let stockLog: {
      previousStock: number;
      newStock: number;
      change: number;
    } | null = null;

    if (data.stock !== undefined && data.stock !== null && data.stock !== "") {
      const newStock = Number(data.stock);

      if (!Number.isFinite(newStock) || !Number.isInteger(newStock)) {
        return NextResponse.json(
          { error: "Stock must be a whole number" },
          { status: 400 },
        );
      }
      if (newStock < 0) {
        return NextResponse.json(
          { error: "Stock cannot be negative" },
          { status: 400 },
        );
      }
      if (newStock > MAX_STOCK_CHANGE) {
        return NextResponse.json(
          {
            error: `Stock cannot be above ${MAX_STOCK_CHANGE.toLocaleString()}. Please check the amount.`,
          },
          { status: 400 },
        );
      }

      data.stock = newStock;
      const previousStock = oldProduct.stock ?? 0;
      if (newStock !== previousStock) {
        stockLog = { previousStock, newStock, change: newStock - previousStock };
      }
    }

    const product = await Product.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    }).populate("category");

    if (stockLog) {
      await StockLog.create({
        product: id,
        change: stockLog.change,
        description: `Stock changed while editing the product (${stockLog.previousStock} → ${stockLog.newStock})`,
        previousStock: stockLog.previousStock,
        resultingStock: stockLog.newStock,
        performedBy: user.id,
      });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete images from Cloudinary (if any)
    for (const img of product.images || []) {
      if (img.publicId) await deleteFromCloudinary(img.publicId, "image");
    }
    // Delete videos from Cloudinary (if any)
    for (const vid of product.videos || []) {
      if (vid.publicId) await deleteFromCloudinary(vid.publicId, "video");
    }

    // Remove product from category's products array
    await Category.findByIdAndUpdate(product.category, {
      $pull: { products: product._id },
    });

    // Delete all stock logs for this product
    await StockLog.deleteMany({ product: id });

    // Delete the product
    await Product.findByIdAndDelete(id);

    return NextResponse.json({ message: "Product deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
