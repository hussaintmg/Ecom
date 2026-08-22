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

    // 1. Validate all products and stock limits first
    const validatedItems = [];
    let calculatedTotalAmount = 0;

    for (const item of items) {
      const { productId: itemProductId, quantity: itemQty, salePrice: itemPrice, description: itemDesc } = item;

      if (!itemProductId || !itemQty || !itemPrice) {
        return NextResponse.json(
          { success: false, error: "Product, quantity, and sale price are required for all items" },
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

      validatedItems.push({
        productObj: product,
        qty,
        price,
        description: itemDesc || "",
      });

      calculatedTotalAmount += price;
    }

    // 2. Perform stock deductions, create StockLogs, and collect invoice products
    const invoiceItems = [];

    for (const validated of validatedItems) {
      const { productObj, qty, price, description: itemDesc } = validated;

      // Prepare nested invoice array element
      invoiceItems.push({
        product: productObj._id,
        category: productObj.category,
        quantity: qty,
        salePrice: price,
        description: itemDesc || "",
      });
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