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
    
    // Search by product name (legacy and nested list)
    if (search) {
      const products = await Product.find({ 
        name: { $regex: search, $options: "i" } 
      }).select("_id");
      
      const productIds = products.map(p => p._id);
      query.$or = [
        { product: { $in: productIds } },
        { "products.product": { $in: productIds } }
      ];
    }
    
    if (product) {
      query.$or = [
        { product: product },
        { "products.product": product }
      ];
    }

    if (category) {
      const categoryFilter = {
        $or: [
          { category: category },
          { "products.category": category }
        ]
      };
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          categoryFilter
        ];
        delete query.$or;
      } else {
        query.$or = categoryFilter.$or;
      }
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

    // Get total count
    const totalInvoices = await Invoice.countDocuments(query);
    const totalPages = Math.ceil(totalInvoices / limit);

    // Get invoices with pagination and populate legacy + nested properties
    const invoices = await Invoice.find(query)
      .populate("product", "name price images stock description")
      .populate("category", "name")
      .populate("products.product", "name price images stock description")
      .populate("products.category", "name")
      .populate("soldBy", "name email role")
      .sort({ createdAt: -1 })
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
      return obj;
    });

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices,
      totalInvoices,
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
    const { productId, quantity, salePrice, description, products } = body;

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

    // 1. Validate all products and stock limits first
    const validatedItems = [];
    let calculatedTotalAmount = 0;

    for (const item of items) {
      const { productId: itemProductId, quantity: itemQty, salePrice: itemPrice, description: itemDesc } = item;

      if (!itemProductId || !itemQty || !itemPrice || !itemDesc) {
        return NextResponse.json(
          { success: false, error: "Product, quantity, sale price, and description are required for all items" },
          { status: 400 }
        );
      }

      const qty = Number(itemQty);
      const price = Number(itemPrice);

      if (qty <= 0) {
        return NextResponse.json(
          { success: false, error: "Sell quantity must be greater than zero" },
          { status: 400 }
        );
      }

      if (price <= 0) {
        return NextResponse.json(
          { success: false, error: "Total sale price must be greater than zero" },
          { status: 400 }
        );
      }

      const product = await Product.findById(itemProductId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found with ID: ${itemProductId}` },
          { status: 404 }
        );
      }

      if (product.stock < qty) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}! Only ${product.stock} available.` },
          { status: 400 }
        );
      }

      validatedItems.push({
        productObj: product,
        qty,
        price,
        description: itemDesc,
      });

      calculatedTotalAmount += price;
    }

    // 2. Perform stock deductions, create StockLogs, and collect invoice products
    const invoiceItems = [];

    for (const validated of validatedItems) {
      const { productObj, qty, price, description: itemDesc } = validated;

      // Deduct stock
      const newStock = productObj.stock - qty;
      productObj.stock = newStock;
      await productObj.save();

      // Log Stock change
      await StockLog.create({
        product: productObj._id,
        change: -qty,
        description: `Manual Sell: ${itemDesc}`,
        resultingStock: newStock,
        performedBy: user.id,
      });

      // Prepare nested invoice array element
      invoiceItems.push({
        product: productObj._id,
        category: productObj.category,
        quantity: qty,
        salePrice: price,
        description: itemDesc,
      });
    }

    // 3. Create Multi-Product Invoice
    const invoice = await Invoice.create({
      products: invoiceItems,
      totalAmount: calculatedTotalAmount,
      soldBy: user.id,
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