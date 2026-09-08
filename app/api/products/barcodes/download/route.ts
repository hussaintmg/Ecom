import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import JSZip from "jszip";
import { generateBarcodeLabelSVG } from "@/utils/barcodeGenerator";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    let productIds: string[] = body.productIds || [];

    // If query string has ids
    if (productIds.length === 0) {
      const { searchParams } = new URL(req.url);
      const idsParam = searchParams.get("ids");
      if (idsParam) {
        productIds = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
      }
    }

    let products: any[] = [];
    if (productIds.length > 0) {
      const validObjectIds = productIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      products = await Product.find({
        $or: [{ _id: { $in: validObjectIds } }, { barcode: { $in: productIds } }],
      })
        .select("name price stock barcode _id")
        .lean();
    } else {
      // If no IDs specified, fetch all products (capped at 500 for safety)
      products = await Product.find({})
        .select("name price stock barcode _id")
        .limit(500)
        .lean();
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { success: false, message: "No matching products found to generate barcodes." },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    // Parallel barcode generation for maximum performance
    await Promise.all(
      products.map(async (prod, idx) => {
        const barcodeValue = prod.barcode?.trim() || prod._id.toString();
        const svgContent = generateBarcodeLabelSVG({
          barcodeValue,
          productName: prod.name,
          price: prod.price,
          currency: "PKR",
          storeName: "MODERN ECOM",
          width: 380,
          height: 220,
        });

        const safeTitle = prod.name
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .substring(0, 30);
        const fileName = `barcode_${idx + 1}_${safeTitle}_${barcodeValue.slice(-6)}.svg`;
        zip.file(fileName, svgContent);
      })
    );

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="product-barcodes.zip"',
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Error generating bulk barcodes ZIP:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate barcodes" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
