import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import CreditSale from "@/models/CreditSale";
import Invoice from "@/models/Invoice";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import { getUserFromRequest } from "@/utils/authHelpers";
import "@/models/User";
import "@/models/Category";

const populateCreditSale = (id: string) =>
  CreditSale.findById(id)
    .populate("products.product", "name price images stock description")
    .populate("products.category", "name")
    .populate("createdBy", "name email role")
    .populate("payments.receivedBy", "name email role")
    .populate("generatedInvoice", "_id type createdAt");

const restoreCreditStock = async (
  creditSale: any,
  userId: string,
  reason: "deleted" | "reverted"
) => {
  if (creditSale.stockRestored) return;

  for (const item of creditSale.products || []) {
    const productId = item.product?._id || item.product;
    const product = await Product.findById(productId);
    if (!product) continue;

    product.stock = product.stock + Number(item.quantity || 0);
    await product.save();

    await StockLog.create({
      product: product._id,
      change: Number(item.quantity || 0),
      description:
        reason === "deleted"
          ? `Credit sale deleted. Stock restored for ${creditSale.customerName}.`
          : `Credit sale reverted. Stock restored for ${creditSale.customerName}.`,
      resultingStock: product.stock,
      performedBy: userId,
    });
  }

  creditSale.stockRestored = true;
};

const createPaidInvoice = async (creditSale: any, userId: string) => {
  if (creditSale.generatedInvoice) return creditSale.generatedInvoice;

  const invoice = await Invoice.create({
    customerName: creditSale.customerName,
    customerPhone: creditSale.customerPhone || "",
    customerEmail: creditSale.customerEmail || "",
    customerAddress: creditSale.customerAddress || "",
    customerCity: creditSale.customerCity || "",
    customerNote: creditSale.customerNote || "",
    products: (creditSale.products || []).map((item: any) => ({
      product: item.product?._id || item.product,
      category: item.category?._id || item.category,
      quantity: item.quantity,
      salePrice: item.salePrice,
      description: item.description || "Converted from paid credit sale",
    })),
    totalAmount: creditSale.totalAmount,
    stockAlreadyDeducted: true,
    sourceCreditSale: creditSale._id,
    soldBy: userId,
    type: "Sell",
  });

  return invoice._id;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);

    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const action = body.action || "payment";
    const creditSale = await CreditSale.findById(id);

    if (!creditSale) {
      return NextResponse.json(
        { success: false, error: "Credit sale not found" },
        { status: 404 }
      );
    }

    if (action === "revert") {
      if (creditSale.status === "Reverted") {
        return NextResponse.json(
          { success: false, error: "Credit sale is already reverted" },
          { status: 400 }
        );
      }

      await restoreCreditStock(creditSale, user.id, "reverted");
      creditSale.status = "Reverted";
      creditSale.remainingAmount = Math.max(
        Number(creditSale.totalAmount || 0) - Number(creditSale.paidAmount || 0),
        0
      );

      if (creditSale.generatedInvoice) {
        await Invoice.findByIdAndDelete(creditSale.generatedInvoice);
        creditSale.generatedInvoice = undefined;
      }

      await creditSale.save();
      return NextResponse.json({
        success: true,
        creditSale: await populateCreditSale(id),
      });
    }

    if (creditSale.status === "Reverted") {
      return NextResponse.json(
        { success: false, error: "Cannot add payment to a reverted credit sale" },
        { status: 400 }
      );
    }

    if (creditSale.status === "Paid") {
      return NextResponse.json(
        { success: false, error: "This credit sale is already fully paid" },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    const remaining = Number(creditSale.remainingAmount || creditSale.totalAmount);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than zero" },
        { status: 400 }
      );
    }

    if (amount > remaining) {
      return NextResponse.json(
        { success: false, error: `Payment cannot exceed remaining amount ${remaining}` },
        { status: 400 }
      );
    }

    const nextPaid = Number(creditSale.paidAmount || 0) + amount;
    const nextRemaining = Math.max(Number(creditSale.totalAmount || 0) - nextPaid, 0);

    creditSale.payments.push({
      amount,
      remainingAmount: nextRemaining,
      receivedAt: new Date(),
      receivedBy: user.id,
    });
    creditSale.paidAmount = nextPaid;
    creditSale.remainingAmount = nextRemaining;

    if (nextRemaining === 0) {
      creditSale.status = "Paid";
      creditSale.generatedInvoice = await createPaidInvoice(creditSale, user.id);
    }

    await creditSale.save();

    return NextResponse.json({
      success: true,
      creditSale: await populateCreditSale(id),
    });
  } catch (error: any) {
    console.error("PATCH credit sale error:", error);
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
    const user = getUserFromRequest(req);

    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const creditSale = await CreditSale.findById(id);

    if (!creditSale) {
      return NextResponse.json(
        { success: false, error: "Credit sale not found" },
        { status: 404 }
      );
    }

    await restoreCreditStock(creditSale, user.id, "deleted");

    if (creditSale.generatedInvoice) {
      await Invoice.findByIdAndDelete(creditSale.generatedInvoice);
    }

    await CreditSale.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Credit sale deleted and stock restored",
    });
  } catch (error: any) {
    console.error("DELETE credit sale error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
