import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CreditSale from "@/models/CreditSale";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import { getUserFromRequest } from "@/utils/authHelpers";
import "@/models/User";
import "@/models/Category";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const product = searchParams.get("product");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      const products = await Product.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");
      query["products.product"] = { $in: products.map((p) => p._id) };
    }

    if (product) {
      query["products.product"] = product;
    }

    if (category) {
      query["products.category"] = category;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const totalCreditSales = await CreditSale.countDocuments(query);
    const totalPages = Math.ceil(totalCreditSales / limit);
    const creditSales = await CreditSale.find(query)
      .populate("products.product", "name price images stock description")
      .populate("products.category", "name")
      .populate("createdBy", "name email role")
      .populate("payments.receivedBy", "name email role")
      .populate("generatedInvoice", "_id type createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      creditSales,
      totalCreditSales,
      totalPages,
      currentPage: page,
      hasMore: skip + creditSales.length < totalCreditSales,
    });
  } catch (error: any) {
    console.error("GET credit sales error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);

    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const { customerName, products } = await req.json();

    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one product is required" },
        { status: 400 }
      );
    }

    const creditItems = [];
    let totalAmount = 0;

    for (const item of products) {
      const qty = Number(item.quantity);
      const price = Number(item.salePrice);

      if (!item.productId || qty <= 0 || price <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Product, quantity, and price are required for all items",
          },
          { status: 400 }
        );
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${item.productId}` },
          { status: 404 }
        );
      }

      if (product.stock < qty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${product.name}! Only ${product.stock} available.`,
          },
          { status: 400 }
        );
      }

      product.stock = product.stock - qty;
      await product.save();

      await StockLog.create({
        product: product._id,
        change: -qty,
        description: `Credit sale created for ${customerName.trim()}${item.description ? `: ${item.description}` : ""}`,
        resultingStock: product.stock,
        performedBy: user.id,
      });

      creditItems.push({
        product: product._id,
        category: product.category,
        quantity: qty,
        salePrice: price,
        description: item.description || "",
      });
      totalAmount += price;
    }

    const creditSale = await CreditSale.create({
      customerName: customerName.trim(),
      products: creditItems,
      totalAmount,
      remainingAmount: totalAmount,
      createdBy: user.id,
    });

    const populatedCreditSale = await CreditSale.findById(creditSale._id)
      .populate("products.product", "name price images stock description")
      .populate("products.category", "name")
      .populate("createdBy", "name email role")
      .populate("payments.receivedBy", "name email role")
      .populate("generatedInvoice", "_id type createdAt");

    return NextResponse.json(
      { success: true, creditSale: populatedCreditSale },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST credit sale error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
