import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { getUserFromRequest } from "@/utils/authHelpers";
import StockLog from "@/models/StockLog";
import { MAX_STOCK_CHANGE } from "@/constants/stock";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort");
    const search = searchParams.get("search") || "";
    const stock = searchParams.get("stock");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    // =========================
    // Query
    // =========================
    let query: any = {};

    // =========================
    // Stock Filter
    // =========================
    if (stock === "InStock") {
      query.stock = { $gt: 0 };
    } else if (stock === "OutOfStock") {
      query.stock = 0;
    }

    // Category Filter - Fix: Convert category name to ObjectId
    if (
      category &&
      category !== "All" &&
      category !== "undefined" &&
      category !== "null"
    ) {
      // First check if the category parameter is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(category)) {
        // If it's a valid ObjectId, use it directly
        query.category = category;
      } else {
        // If it's a category name, find the category first
        const categoryDoc = await Category.findOne({
          name: { $regex: new RegExp(`^${category}$`, "i") },
        });

        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          // If no category found, return empty results
          return NextResponse.json({
            success: true,
            products: [],
            totalProducts: 0,
            totalStock: 0,
            currentPage: page,
            totalPages: 0,
            hasMore: false,
          });
        }
      }
    }

    // =========================
    // Search
    // =========================
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      query.name = {
        $regex: `\\b${escapedSearch}`,
        $options: "i",
      };
    }

    // =========================
    // Sort
    // =========================
    let sortOption: any = { createdAt: -1 };
    if (sort === "name-asc") {
      sortOption = { name: 1 };
    } else if (sort === "name-desc") {
      sortOption = { name: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    // =========================
    // Products
    // =========================
    const products = await Product.find(query)
      .select("name images description stock category price")
      .populate("category")
      .sort(sortOption)
      .lean()
      .skip(skip)
      .limit(limit);

    // =========================
    // Total Count
    // =========================
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // =========================
    // Total Stock Calculation
    // =========================
    const stockResult = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stock" },
        },
      },
    ]);
    const totalStock = stockResult.length > 0 ? stockResult[0].totalStock : 0;

    return NextResponse.json({
      success: true,
      products,
      totalProducts,
      totalPages,
      totalStock,
      currentPage: page,
      hasMore: skip + products.length < totalProducts,
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch products",
      },
      { status: 500 },
    );
  }
}

/**
 * Record the opening stock of freshly created products so the very first
 * quantity also shows up in the stock history — and can be corrected or
 * undone from there if it was typed wrong.
 */
const logOpeningStock = async (products: any[], userId?: string) => {
  const entries = products
    .filter((p) => p && Number(p.stock) > 0)
    .map((p) => ({
      product: p._id,
      change: Number(p.stock),
      description: "Opening stock set when the product was created",
      previousStock: 0,
      resultingStock: Number(p.stock),
      performedBy: userId,
    }));

  if (entries.length > 0) await StockLog.insertMany(entries);
};

export async function POST(request: NextRequest) {
  const products = [
    {
      name: "0.1KW / 100W",
    },
    {
      name: "0.2KW / 200W",
    },
    {
      name: "0.4KW / 0.5HP",
    },
    {
      name: "0.75KW / 1HP",
    },
    {
      name: "1.5KW / 2HP",
    },
    {
      name: "2.2KW / 3HP",
    },
    {
      name: "3.7KW / 5HP",
    },
    {
      name: "5.5KW / 7.5HP",
    },
    {
      name: "7.5KW / 10HP",
    },
    {
      name: "11KW / 15HP",
    },
    {
      name: "15KW / 20HP",
    },
    {
      name: "18.5KW / 25HP",
    },
    {
      name: "22KW / 30HP",
    },
    {
      name: "30KW / 40HP",
    },
    {
      name: "37KW / 50HP",
    },
    {
      name: "45KW / 60HP",
    },
    {
      name: "55KW / 75HP",
    },
    {
      name: "75KW / 100HP",
    },
    {
      name: "90KW / 125HP",
    },
    {
      name: "110KW / 150HP",
    },
    {
      name: "132KW / 175HP",
    },
    {
      name: "160KW / 215HP",
    },
    {
      name: "185KW / 250HP",
    },
    {
      name: "220KW / 300HP",
    },
    {
      name: "280KW / 375HP",
    },
    {
      name: "315KW / 420HP",
    },
    {
      name: "355KW / 475HP",
    },
    {
      name: "450KW / 600HP",
    },
  ];

  try {
    await connectDB();
    const user = getUserFromRequest(request);
    const body = await request.json();

    // Guard the opening stock the same way manual adjustments are guarded —
    // a mistyped opening quantity is just as costly as a mistyped top-up.
    if (body.stock !== undefined && body.stock !== null && body.stock !== "") {
      const openingStock = Number(body.stock);
      if (!Number.isFinite(openingStock) || !Number.isInteger(openingStock)) {
        return NextResponse.json(
          { error: "Stock must be a whole number" },
          { status: 400 },
        );
      }
      if (openingStock < 0) {
        return NextResponse.json(
          { error: "Stock cannot be negative" },
          { status: 400 },
        );
      }
      if (openingStock > MAX_STOCK_CHANGE) {
        return NextResponse.json(
          {
            error: `Stock cannot be above ${MAX_STOCK_CHANGE.toLocaleString()}. Please check the amount.`,
          },
          { status: 400 },
        );
      }
      body.stock = openingStock;
    }

    console.log("body", body);
    console.log("Received invoice data:", body.generateAllCategories);
    console.log("Received invoice data:", body.generateAllCategories === true);
    // Check if generateAllCategories is true
    if (body.generateAllCategories === true) {
      // Your products list from products.json

      const voltageVariants = ["440V", "220V"];
      const finalProducts = [];
      // Loop through products
      for (const product of products) {
        // Loop through voltages
        for (const voltage of voltageVariants) {
          finalProducts.push({
            name: `${body.name} ${product.name} ${voltage}`,
            description: `${body.description} ${product.name} ${voltage}`,
            category: body.category,
            stock: body.stock,
            images: body.images || [],
          });
        }
      }

      // Save all generated products
      const savedProducts = await Product.insertMany(finalProducts);
      await logOpeningStock(savedProducts, user?.id);
      return NextResponse.json(
        {
          success: true,
          message: `${savedProducts.length} products created`,
          products: savedProducts,
        },
        { status: 201 },
      );
    } else {
      // Simple: Save single product as is
      const product = await Product.create(body);
      await logOpeningStock([product], user?.id);
      return NextResponse.json(product, { status: 201 });
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
