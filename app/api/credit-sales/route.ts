import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CreditSale from "@/models/CreditSale";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import { getUserFromRequest } from "@/utils/authHelpers";
import { normalizeCustomerDetails } from "@/utils/customerDetails";
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

    const body = await req.json();
    const { products } = body;
    const customer = normalizeCustomerDetails(body);
    const customerName = customer.customerName;

    if (!customerName) {
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

    // 1. Validate inputs and calculate cumulative stock needed per product
    const totalQtyNeededMap: Record<string, number> = {};
    for (const item of products) {
      const { productId: itemProductId, quantity: itemQty, salePrice: itemPrice } = item;

      if (!itemProductId || itemQty === undefined || itemPrice === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: "Product, quantity, and price are required for all items",
          },
          { status: 400 }
        );
      }

      const qty = Number(itemQty);
      const price = Number(itemPrice);

      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { success: false, error: "Quantity must be greater than zero" },
          { status: 400 }
        );
      }

      if (isNaN(price) || price <= 0) {
        return NextResponse.json(
          { success: false, error: "Credit price must be greater than zero" },
          { status: 400 }
        );
      }

      const pidStr = String(itemProductId);
      totalQtyNeededMap[pidStr] = (totalQtyNeededMap[pidStr] || 0) + qty;
    }

    // Verify stock availability for cumulative quantities
    for (const [pId, totalQty] of Object.entries(totalQtyNeededMap)) {
      const product = await Product.findById(pId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${pId}` },
          { status: 404 }
        );
      }

      if (product.stock < totalQty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${product.name}! Available: ${product.stock}, Total requested: ${totalQty}.`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Perform atomic stock deductions, create StockLogs, and collect credit items
    const creditItems = [];
    let totalAmount = 0;

    for (const item of products) {
      const { productId: itemProductId, quantity: itemQty, salePrice: itemPrice, description: itemDesc } = item;
      const qty = Number(itemQty);
      const price = Number(itemPrice);

      const prevDoc = await Product.findOneAndUpdate(
        { _id: itemProductId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: false }
      );

      if (!prevDoc) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock changed concurrently or insufficient stock for product ID: ${itemProductId}`,
          },
          { status: 400 }
        );
      }

      const previousStock = prevDoc.stock;
      const resultingStock = previousStock - qty;

      await StockLog.create({
        product: itemProductId,
        change: -qty,
        description: `Credit sale created for ${customerName}${itemDesc ? `: ${itemDesc}` : ""}`,
        previousStock,
        resultingStock,
        performedBy: user.id,
      });

      // Update product price if not already set or zero
      const unitP = Math.round(price / qty);
      if (unitP > 0 && (!prevDoc.price || prevDoc.price === 0)) {
        await Product.updateOne({ _id: itemProductId }, { $set: { price: unitP } });
      }

      creditItems.push({
        product: itemProductId,
        category: prevDoc.category,
        quantity: qty,
        salePrice: price,
        description: itemDesc || "",
      });
      totalAmount += price;
    }

    const creditSale = await CreditSale.create({
      ...customer,
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
