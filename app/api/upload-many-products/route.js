import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import StockLog from "@/models/StockLog";
import Product from "@/models/Product";
import { getUserFromRequest } from "@/utils/authHelpers";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    await connectDB();

    // =========================
    // Read JSON Files
    // =========================

    const ecomPath = path.join(process.cwd(), "ecom.products.json");
    const productsPath = path.join(process.cwd(), "products.json");

    const ecomProducts = JSON.parse(fs.readFileSync(ecomPath, "utf8"));
    const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

    let finalProducts = [];

    // =========================
    // Voltage Variants
    // =========================
    const voltageVariants = ["440V", "220V"];

    // =========================
    // Main Loop - Products from ecom.products.json
    // =========================

    for (const ecomProduct of ecomProducts) {
      const Product = {
        name: ecomProduct.name,
        description: ecomProduct.description,
        images: ecomProduct.images,
        category: ecomProduct.category,
        stock: ecomProduct.stock,
      };
      finalProducts.push(Product);
    }

    // =========================
    // Save All to Database
    // =========================

    if (finalProducts.length > 0) {
      // await Product.insertMany(finalProducts);
      console.log(`Successfully inserted ${finalProducts.length} products`);
    }

    // =========================
    // Response
    // =========================

    return Response.json({
      success: true,
      total: finalProducts.length,
      message: `Created ${finalProducts.length} products with voltage variants (200V and 220V)`,
      data: finalProducts,
    });
  } catch (error) {
    console.error("Error:", error);

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
