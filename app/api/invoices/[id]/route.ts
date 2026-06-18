// app/api/invoices/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Invoice from "@/models/Invoice";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const invoice = await Invoice.findById(id)
      .populate("product", "name price images stock description")
      .populate("category", "name")
      .populate("products.product", "name price images stock description")
      .populate("products.category", "name")
      .populate("soldBy", "name email role");
    
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    const obj = invoice.toObject ? invoice.toObject() : invoice;
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
    
    return NextResponse.json({
      success: true,
      invoice: obj,
    });
    
  } catch (error: any) {
    console.error("GET invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }
    
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    if ((invoice.type || "Sell") === "Sell" && !invoice.stockAlreadyDeducted) {
      const invoiceItems =
        invoice.products && invoice.products.length > 0
          ? invoice.products
          : [
              {
                product: invoice.product,
                quantity: invoice.quantity,
                description: invoice.description,
              },
            ];

      for (const item of invoiceItems) {
        const productId = item.product?._id || item.product;
        const qty = Number(item.quantity || 0);
        if (!productId || qty <= 0) continue;

        const product = await Product.findById(productId);
        if (!product) continue;

        product.stock = product.stock + qty;
        await product.save();

        await StockLog.create({
          product: product._id,
          change: qty,
          description: `Sell invoice deleted. Stock restored for ${invoice.customerName || "customer"}.`,
          resultingStock: product.stock,
          performedBy: user.id,
        });
      }
    }

    await Invoice.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: "Invoice deleted successfully",
    });
    
  } catch (error: any) {
    console.error("DELETE invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
