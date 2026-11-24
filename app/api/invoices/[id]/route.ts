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

export async function PUT(
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

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerCity,
      customerNote,
      products: updatedProducts,
    } = body;

    if (customerName !== undefined) invoice.customerName = customerName.trim();
    if (customerPhone !== undefined) invoice.customerPhone = customerPhone.trim();
    if (customerEmail !== undefined) invoice.customerEmail = customerEmail.trim();
    if (customerAddress !== undefined) invoice.customerAddress = customerAddress.trim();
    if (customerCity !== undefined) invoice.customerCity = customerCity.trim();
    if (customerNote !== undefined) invoice.customerNote = customerNote.trim();

    // If products array is provided and this is a "Sell" invoice, adjust stock deltas
    if (Array.isArray(updatedProducts) && updatedProducts.length > 0) {
      if ((invoice.type || "Sell") === "Sell" && !invoice.stockAlreadyDeducted) {
        // Build map of current quantities per product
        const oldItems =
          invoice.products && invoice.products.length > 0
            ? invoice.products
            : [
                {
                  product: invoice.product,
                  quantity: invoice.quantity,
                  salePrice: invoice.salePrice,
                  description: invoice.description,
                },
              ];

        const oldQtyMap: Record<string, number> = {};
        for (const item of oldItems) {
          const pid = String(item.product?._id || item.product);
          oldQtyMap[pid] = (oldQtyMap[pid] || 0) + Number(item.quantity || 0);
        }

        const newQtyMap: Record<string, number> = {};
        for (const item of updatedProducts) {
          const pid = String(item.productId || item.product?._id || item.product);
          newQtyMap[pid] = (newQtyMap[pid] || 0) + Number(item.quantity || 0);
        }

        // Check stock availability for any product where quantity increased
        for (const [pid, newQty] of Object.entries(newQtyMap)) {
          const oldQty = oldQtyMap[pid] || 0;
          const delta = newQty - oldQty;
          if (delta > 0) {
            const productDoc = await Product.findById(pid);
            if (!productDoc) {
              return NextResponse.json(
                { success: false, error: `Product not found: ${pid}` },
                { status: 400 }
              );
            }
            if (productDoc.stock < delta) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Insufficient stock for "${productDoc.name}". Requested increase: ${delta}, available in warehouse: ${productDoc.stock}`,
                },
                { status: 400 }
              );
            }
          }
        }

        // Apply stock adjustments
        const allProductIds = new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)]);
        for (const pid of allProductIds) {
          const oldQty = oldQtyMap[pid] || 0;
          const newQty = newQtyMap[pid] || 0;
          const delta = newQty - oldQty;
          if (delta !== 0) {
            const productDoc = await Product.findById(pid);
            if (productDoc) {
              productDoc.stock = productDoc.stock - delta;
              await productDoc.save();

              await StockLog.create({
                product: productDoc._id,
                change: -delta,
                description: `Invoice #${invoice._id} updated: quantity changed from ${oldQty} to ${newQty}. Customer: ${invoice.customerName || "Customer"}.`,
                resultingStock: productDoc.stock,
                performedBy: user.id,
              });
            }
          }
        }
      }

      // Reformat products array for invoice
      let calculatedTotal = 0;
      invoice.products = updatedProducts.map((p: any) => {
        const itemPrice = Number(p.salePrice || 0);
        calculatedTotal += itemPrice;
        return {
          product: p.productId || p.product?._id || p.product,
          category: p.categoryId || p.category?._id || p.category,
          quantity: Number(p.quantity || 1),
          salePrice: itemPrice,
          description: (p.description || "").trim(),
        };
      });
      invoice.totalAmount = calculatedTotal;
    }

    await invoice.save();

    const populated = await Invoice.findById(invoice._id)
      .populate("product", "name price images stock description")
      .populate("category", "name")
      .populate("products.product", "name price images stock description")
      .populate("products.category", "name")
      .populate("soldBy", "name email role");

    return NextResponse.json({
      success: true,
      message: "Invoice updated successfully",
      invoice: populated,
    });
  } catch (error: any) {
    console.error("PUT invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update invoice" },
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
