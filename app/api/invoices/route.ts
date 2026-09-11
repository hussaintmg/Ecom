// app/api/invoices/route.ts

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Invoice from "@/models/Invoice";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import { getUserFromRequest } from "@/utils/authHelpers";
import { normalizeCustomerDetails } from "@/utils/customerDetails";
import User from "@/models/User";
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
    const type = searchParams.get("type");
    const soldBy = searchParams.get("soldBy");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sort = searchParams.get("sort") || "newest";
    
    const skip = (page - 1) * limit;

    const conditions: any[] = [];
    
    // Universal search across customer details, products, description, staff, and type
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = { $regex: escaped, $options: "i" };

      const matchingProducts = await Product.find({ 
        name: searchRegex 
      }).select("_id");
      const productIds = matchingProducts.map(p => p._id);

      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).select("_id");
      const userIds = matchingUsers.map(u => u._id);

      const searchOr: any[] = [
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { customerEmail: searchRegex },
        { customerCity: searchRegex },
        { customerAddress: searchRegex },
        { customerNote: searchRegex },
        { description: searchRegex },
        { "products.description": searchRegex },
        { type: searchRegex },
      ];

      if (productIds.length > 0) {
        searchOr.push({ product: { $in: productIds } });
        searchOr.push({ "products.product": { $in: productIds } });
      }

      if (userIds.length > 0) {
        searchOr.push({ soldBy: { $in: userIds } });
      }

      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        searchOr.push({ _id: search });
      }

      conditions.push({ $or: searchOr });
    }
    
    if (product && product !== "all") {
      conditions.push({
        $or: [
          { product: product },
          { "products.product": product }
        ]
      });
    }

    if (category && category !== "all") {
      conditions.push({
        $or: [
          { category: category },
          { "products.category": category }
        ]
      });
    }

    if (type && type !== "all") {
      conditions.push({ type });
    }

    if (soldBy && soldBy !== "all") {
      conditions.push({ soldBy });
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

    // Sort configuration
    let sortObj: any = { createdAt: -1 };
    if (sort === "oldest") sortObj = { createdAt: 1 };
    else if (sort === "amount_desc") sortObj = { totalAmount: -1 };
    else if (sort === "amount_asc") sortObj = { totalAmount: 1 };
    else sortObj = { createdAt: -1 };

    // Get total count & aggregate total revenue for matched invoices
    const totalInvoices = await Invoice.countDocuments(query);
    const totalPages = Math.ceil(totalInvoices / limit);

    const aggregateSum = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $ifNull: ["$totalAmount", "$salePrice", 0] }
          }
        }
      }
    ]);
    const totalAmountSum = aggregateSum[0]?.totalRevenue || 0;

    // Available sellers for filter dropdown
    const sellers = await User.find({ role: { $in: ["admin", "owner"] } }).select("_id name email role");

    // Get invoices with pagination and populate legacy + nested properties
    const invoices = await Invoice.find(query)
      .populate("product", "name price images stock description")
      .populate("category", "name")
      .populate("products.product", "name price images stock description")
      .populate("products.category", "name")
      .populate("soldBy", "name email role")
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Standardize all invoices to have the products array and totalAmount
    const formattedInvoices = invoices.map(inv => {
      const obj = inv.toObject ? inv.toObject() : inv;
      if (!obj.products || obj.products.length === 0) {
        obj.products = [{
          product: obj.product,
          category: obj.category,
          quantity: obj.quantity,
          salePrice: obj.salePrice,
          description: obj.description || "No description",
          _id: obj._id,
        }];
        obj.totalAmount = obj.salePrice;
      }
      obj.customerName = obj.customerName || "Walk-in Customer";
      obj.customerPhone = obj.customerPhone || "";
      obj.customerEmail = obj.customerEmail || "";
      obj.customerAddress = obj.customerAddress || "";
      obj.customerCity = obj.customerCity || "";
      obj.customerNote = obj.customerNote || "";
      return obj;
    });

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices,
      totalInvoices,
      totalAmountSum,
      sellers,
      totalPages,
      currentPage: page,
      hasMore: skip + formattedInvoices.length < totalInvoices,
    });
    
  } catch (error: any) {
    console.error("GET invoices error:", error);
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
    
    // Allow admins and owners
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { productId, quantity, salePrice, description, products, type } = body;
    const customer = normalizeCustomerDetails(body);

    if (!customer.customerName) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }

    // Support both single item input and products array
    const items = products || [
      { productId, quantity, salePrice, description }
    ];

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No products provided for manual sell" },
        { status: 400 }
      );
    }

    // 1. Validate inputs and calculate cumulative stock needed per product
    const totalQtyNeededMap: Record<string, number> = {};
    for (const item of items) {
      const { productId: itemProductId, quantity: itemQty, salePrice: itemPrice } = item;

      if (!itemProductId || itemQty === undefined || itemPrice === undefined) {
        return NextResponse.json(
          { success: false, error: "Product, quantity, and sale price are required for all items" },
          { status: 400 }
        );
      }

      const qty = Number(itemQty);
      const price = Number(itemPrice);

      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { success: false, error: "Sell quantity must be greater than zero" },
          { status: 400 }
        );
      }

      if (isNaN(price) || price <= 0) {
        return NextResponse.json(
          { success: false, error: "Total sale price must be greater than zero" },
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
          { success: false, error: `Product not found with ID: ${pId}` },
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

    // 2. Perform atomic stock deductions, create StockLogs, and collect invoice products
    const invoiceItems = [];
    let calculatedTotalAmount = 0;

    for (const item of items) {
      const { productId: itemProductId, quantity: itemQty, salePrice: itemPrice, description: itemDesc } = item;
      const qty = Number(itemQty);
      const price = Number(itemPrice);

      // Deduct stock atomically in MongoDB
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

      // Log Stock change with accurate quantities
      await StockLog.create({
        product: itemProductId,
        change: -qty,
        description: `Manual Sell${itemDesc ? `: ${itemDesc}` : ""}`,
        previousStock,
        resultingStock,
        performedBy: user.id,
      });

      // Update product price if not already set or zero
      const unitP = Math.round(price / qty);
      if (unitP > 0 && (!prevDoc.price || prevDoc.price === 0)) {
        await Product.updateOne({ _id: itemProductId }, { $set: { price: unitP } });
      }

      // Prepare nested invoice array element
      invoiceItems.push({
        product: itemProductId,
        category: prevDoc.category,
        quantity: qty,
        salePrice: price,
        description: itemDesc || "",
      });

      calculatedTotalAmount += price;
    }

    // 3. Create Multi-Product Invoice
    const invoice = await Invoice.create({
      ...customer,
      products: invoiceItems,
      totalAmount: calculatedTotalAmount,
      soldBy: user.id,
      type,
    });

    // Populate the created invoice details
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("products.product", "name price images stock")
      .populate("products.category", "name")
      .populate("soldBy", "name email role");

    // Standardize returned object
    const returnObj = populatedInvoice.toObject ? populatedInvoice.toObject() : populatedInvoice;
    if (!returnObj.products || returnObj.products.length === 0) {
      returnObj.products = [{
        product: returnObj.product,
        category: returnObj.category,
        quantity: returnObj.quantity,
        salePrice: returnObj.salePrice,
        description: returnObj.description || "No description",
        _id: returnObj._id,
      }];
      returnObj.totalAmount = returnObj.salePrice;
    }
    returnObj.customerName = returnObj.customerName || "Walk-in Customer";

    return NextResponse.json({
      success: true,
      invoice: returnObj,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("POST invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}