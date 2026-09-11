import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CreditSale from "@/models/CreditSale";
import Product from "@/models/Product";
import User from "@/models/User";
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
    const search = (searchParams.get("search") || "").trim();
    const product = searchParams.get("product");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const createdBy = searchParams.get("createdBy");
    const balanceStatus = searchParams.get("balanceStatus");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sort = searchParams.get("sort") || "newest";
    const skip = (page - 1) * limit;

    const conditions: any[] = [];

    // Universal search across customer details, products, description, staff, and status
    if (search) {
      const cleanSearch = search.replace(/^CR-/i, "");
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cleanEscaped = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = { $regex: escaped, $options: "i" };

      // Search in products by name
      const matchingProducts = await Product.find({
        name: searchRegex,
      }).select("_id");
      const productIds = matchingProducts.map((p) => p._id);

      // Search in users by name or email
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select("_id");
      const userIds = matchingUsers.map((u) => u._id);

      const searchOr: any[] = [
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { customerEmail: searchRegex },
        { customerCity: searchRegex },
        { customerAddress: searchRegex },
        { customerNote: searchRegex },
        { "products.description": searchRegex },
        { status: searchRegex },
      ];

      if (productIds.length > 0) {
        searchOr.push({ "products.product": { $in: productIds } });
      }

      if (userIds.length > 0) {
        searchOr.push({ createdBy: { $in: userIds } });
      }

      if (/^[0-9a-fA-F]{24}$/.test(cleanSearch)) {
        searchOr.push({ _id: cleanSearch });
      }

      conditions.push({ $or: searchOr });
    }

    if (product && product !== "all") {
      conditions.push({ "products.product": product });
    }

    if (category && category !== "all") {
      conditions.push({ "products.category": category });
    }

    if (status && status !== "all") {
      conditions.push({ status });
    }

    if (createdBy && createdBy !== "all") {
      conditions.push({ createdBy });
    }

    if (balanceStatus === "pending") {
      conditions.push({ remainingAmount: { $gt: 0 } });
    } else if (balanceStatus === "settled") {
      conditions.push({ remainingAmount: { $lte: 0 } });
    }

    if (startDate || endDate) {
      const dateCond: any = {};
      if (startDate) dateCond.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateCond.$lte = end;
      }
      conditions.push({ createdAt: dateCond });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    // Sort order
    let sortObj: any = { createdAt: -1 };
    if (sort === "oldest") sortObj = { createdAt: 1 };
    else if (sort === "remaining_desc") sortObj = { remainingAmount: -1 };
    else if (sort === "total_desc") sortObj = { totalAmount: -1 };
    else sortObj = { createdAt: -1 };

    const totalCreditSales = await CreditSale.countDocuments(query);
    const totalPages = Math.ceil(totalCreditSales / limit);

    // Aggregate summary statistics
    const aggregateSums = await CreditSale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmountSum: { $sum: { $ifNull: ["$totalAmount", 0] } },
          totalRemainingSum: { $sum: { $ifNull: ["$remainingAmount", 0] } },
          totalPaidSum: { $sum: { $ifNull: ["$paidAmount", 0] } },
        },
      },
    ]);

    const totalAmountSum = aggregateSums[0]?.totalAmountSum || 0;
    const totalRemainingSum = aggregateSums[0]?.totalRemainingSum || 0;
    const totalPaidSum = aggregateSums[0]?.totalPaidSum || 0;

    // Available creators for staff dropdown
    const creators = await User.find({ role: { $in: ["admin", "owner"] } }).select(
      "_id name email role"
    );

    const creditSales = await CreditSale.find(query)
      .populate("products.product", "name price images stock description")
      .populate("products.category", "name")
      .populate("createdBy", "name email role")
      .populate("payments.receivedBy", "name email role")
      .populate("generatedInvoice", "_id type createdAt")
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      creditSales,
      totalCreditSales,
      totalAmountSum,
      totalRemainingSum,
      totalPaidSum,
      creators,
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
