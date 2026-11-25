// app/api/invoices/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Invoice from "@/models/Invoice";
import CreditSale from "@/models/CreditSale";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import { getUserFromRequest } from "@/utils/authHelpers";
import { reconcileLineItemsAndStock } from "@/utils/stockDelta";

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

    // Update products & recalculate totals / warehouse stock deltas
    if (updatedProducts !== undefined) {
      if (!Array.isArray(updatedProducts) || updatedProducts.length === 0) {
        return NextResponse.json(
          { success: false, error: "Invoice must contain at least one product item." },
          { status: 400 }
        );
      }

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

      // If linked to a CreditSale, pre-check paidAmount floor before mutating warehouse stock
      let linkedCredit: any = null;
      if (invoice.sourceCreditSale) {
        linkedCredit = await CreditSale.findById(invoice.sourceCreditSale);
        if (linkedCredit) {
          const candidateTotal = updatedProducts.reduce(
            (sum: number, p: any) => sum + (Number(p.salePrice) || 0),
            0
          );
          const paid = Number(linkedCredit.paidAmount || 0);
          if (candidateTotal < paid) {
            return NextResponse.json(
              {
                success: false,
                error: `Updated total (Rs. ${candidateTotal.toLocaleString()}) cannot be less than already paid Credit Sale amount (Rs. ${paid.toLocaleString()}).`,
              },
              { status: 400 }
            );
          }
        }
      }

      // Regular manual sells (!stockAlreadyDeducted) and converted CreditSale invoices
      // adjust good warehouse stock. Defective-sales (stockAlreadyDeducted && !sourceCreditSale)
      // and Repair invoices do not deduct normal warehouse sellable stock.
      const shouldAdjustWarehouseStock =
        (invoice.type || "Sell") === "Sell" &&
        (!invoice.stockAlreadyDeducted || Boolean(invoice.sourceCreditSale));

      const reconcile = await reconcileLineItemsAndStock({
        oldItems,
        newItemsRaw: updatedProducts,
        adjustWarehouseStock: shouldAdjustWarehouseStock,
        userId: user.id,
        invoiceId: invoice._id,
        logContextLabel: `Invoice #${invoice._id.toString().slice(-6).toUpperCase()} updated (${invoice.customerName || "Customer"})`,
      });

      if (!reconcile.ok) {
        return NextResponse.json(
          { success: false, error: reconcile.error },
          { status: reconcile.status }
        );
      }

      if (linkedCredit) {
        const paid = Number(linkedCredit.paidAmount || 0);
        linkedCredit.products = reconcile.items as any;
        linkedCredit.totalAmount = reconcile.totalAmount;
        linkedCredit.remainingAmount = Math.max(0, reconcile.totalAmount - paid);
        if (linkedCredit.status !== "Reverted") {
          linkedCredit.status = linkedCredit.remainingAmount === 0 ? "Paid" : "Open";
        }
        linkedCredit.customerName = invoice.customerName || linkedCredit.customerName;
        linkedCredit.customerPhone = invoice.customerPhone || "";
        linkedCredit.customerEmail = invoice.customerEmail || "";
        linkedCredit.customerAddress = invoice.customerAddress || "";
        linkedCredit.customerCity = invoice.customerCity || "";
        linkedCredit.customerNote = invoice.customerNote || "";
        await linkedCredit.save();
      }

      invoice.products = reconcile.items as any;
      invoice.totalAmount = reconcile.totalAmount;
      if (reconcile.items.length === 1) {
        invoice.product = reconcile.items[0].product;
        invoice.category = reconcile.items[0].category;
        invoice.quantity = reconcile.items[0].quantity;
        invoice.salePrice = reconcile.items[0].salePrice;
        invoice.description = reconcile.items[0].description;
      } else {
        invoice.product = undefined;
        invoice.category = undefined;
        invoice.quantity = undefined;
        invoice.salePrice = undefined;
      }
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
