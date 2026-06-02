// app/api/invoices/route.ts

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Invoice from "@/models/Invoice";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import { getUserFromRequest } from "@/utils/authHelpers";

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

    let query: any = {};
    
    // Search by product name
    if (search) {
      const products = await Product.find({ 
        name: { $regex: search, $options: "i" } 
      }).select("_id");
      
      const productIds = products.map(p => p._id);
      query.product = { $in: productIds };
    }
    
    if (product) query.product = product;
    if (category) query.category = category;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Get total count
    const totalInvoices = await Invoice.countDocuments(query);
    const totalPages = Math.ceil(totalInvoices / limit);

    // Get invoices with pagination
    const invoices = await Invoice.find(query)
      .populate("product", "name price images stock description")
      .populate("category", "name")
      .populate("soldBy", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      invoices,
      totalInvoices,
      totalPages,
      currentPage: page,
      hasMore: skip + invoices.length < totalInvoices,
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

    const { productId, quantity, salePrice, description } = await req.json();

    if (!productId || !quantity || !salePrice || !description) {
      return NextResponse.json(
        { success: false, error: "Product, quantity, sale price, and description are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Sell quantity must be positive" },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { success: false, error: `Insufficient stock! Only ${product.stock} available.` },
        { status: 400 }
      );
    }

    // Process logic correctly:
    // 1. Reduce stock
    const newStock = product.stock - quantity;
    product.stock = newStock;
    await product.save();

    // 2. Add StockLog
    await StockLog.create({
      product: product._id,
      change: -quantity,
      description: `Manual Sell: ${description}`,
      resultingStock: newStock,
      performedBy: user.id,
    });

    // 3. Create Invoice
    const invoice = await Invoice.create({
      product: product._id,
      category: product.category,
      quantity,
      salePrice,
      description,
      soldBy: user.id,
    });

    // Populate the created invoice
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("product", "name price images stock")
      .populate("category", "name")
      .populate("soldBy", "name email role");

    return NextResponse.json({
      success: true,
      invoice: populatedInvoice,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("POST invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}