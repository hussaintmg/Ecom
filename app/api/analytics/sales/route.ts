import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Invoice from "@/models/Invoice";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getUserFromRequest(req);
    // Secure to owner
    if (!admin || admin.role !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    // 1. Daily Income Breakdown
    // Fetch last 30 days orders and invoices that are fully paid
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orderQuery: any = { createdAt: { $gte: thirtyDaysAgo } };
    const invoiceQuery: any = { createdAt: { $gte: thirtyDaysAgo } };

    if (productId) {
      orderQuery["items.product"] = productId;
      invoiceQuery.product = productId;
    }

    const orders = await Order.find(orderQuery).lean();
    const invoices = await Invoice.find(invoiceQuery).lean();

    const dailyIncomeMap = new Map();

    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dailyIncomeMap.set(dateStr, 0);
    }

    // Process Orders
    orders.forEach(order => {
        const dateStr = new Date(order.createdAt).toISOString().split("T")[0];
        if (dailyIncomeMap.has(dateStr)) {
            // If checking a specific product, we need to sum ONLY its contribution to the order
            let productContribution = order.totalPrice; 
            if (productId) {
               productContribution = order.items.reduce((sum: number, item: any) => {
                   return item.product.toString() === productId ? sum + (item.price * item.quantity) : sum;
               }, 0);
            }
            dailyIncomeMap.set(dateStr, dailyIncomeMap.get(dateStr) + productContribution);
        }
    });

    // Process Invoices
    invoices.forEach(inv => {
        const dateStr = new Date(inv.createdAt).toISOString().split("T")[0];
        if (dailyIncomeMap.has(dateStr)) {
            dailyIncomeMap.set(dateStr, dailyIncomeMap.get(dateStr) + inv.salePrice);
        }
    });

    // Format for Recharts { name: 'YYYY-MM-DD', income: Number }
    const dailyIncome = Array.from(dailyIncomeMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    // 2. Low Stock Products
    const lowStockProducts = await Product.find({ stock: { $lt: 15 } })
        .select("name stock price")
        .sort({ stock: 1 })
        .limit(10);

    return NextResponse.json({
      dailyIncome,
      lowStockProducts
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
