import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import Invoice from "@/models/Invoice";
import CreditSale from "@/models/CreditSale";
import "@/models/User";
import "@/models/Category";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // 1. Fetch products from invoices
    const invoices = await Invoice.find({})
      .select("products product quantity salePrice")
      .lean();

    const priceMap = new Map<string, { price: number; source: string }>();

    for (const inv of invoices) {
      // Nested products array
      if (Array.isArray(inv.products)) {
        for (const item of inv.products) {
          const pId = item?.product?._id?.toString() || item?.product?.toString();
          const qty = Number(item.quantity) || 1;
          const saleP = Number(item.salePrice) || 0;
          if (pId && qty > 0 && saleP > 0) {
            const unitP = Math.round(saleP / qty);
            if (unitP > 0) {
              priceMap.set(pId, { price: unitP, source: "invoice" });
            }
          }
        }
      }
      // Legacy single product
      if (inv.product) {
        const pId = (inv.product as any)?._id?.toString() || inv.product.toString();
        const qty = Number(inv.quantity) || 1;
        const saleP = Number(inv.salePrice) || 0;
        if (pId && qty > 0 && saleP > 0) {
          const unitP = Math.round(saleP / qty);
          if (unitP > 0) {
            priceMap.set(pId, { price: unitP, source: "legacy-invoice" });
          }
        }
      }
    }

    // 2. Fetch products from credit sales
    const creditSales = await CreditSale.find({})
      .select("products")
      .lean();

    for (const cs of creditSales) {
      if (Array.isArray(cs.products)) {
        for (const item of cs.products) {
          const pId = item?.product?._id?.toString() || item?.product?.toString();
          const qty = Number(item.quantity) || 1;
          const saleP = Number(item.salePrice) || 0;
          if (pId && qty > 0 && saleP > 0) {
            const unitP = Math.round(saleP / qty);
            if (unitP > 0) {
              priceMap.set(pId, { price: unitP, source: "credit-sale" });
            }
          }
        }
      }
    }

    // 3. Bulk update all products found in invoices & credit sales
    const bulkOps = Array.from(priceMap.entries()).map(([pId, data]) => ({
      updateOne: {
        filter: { _id: pId },
        update: { $set: { price: data.price } },
      },
    }));

    let updatedCount = 0;
    if (bulkOps.length > 0) {
      const res = await Product.bulkWrite(bulkOps, { ordered: false });
      updatedCount = res.modifiedCount || 0;
    }

    // 4. Also check total products in DB and how many have price > 0
    const totalProducts = await Product.countDocuments();
    const pricedProducts = await Product.countDocuments({ price: { $gt: 0 } });
    const samplePriced = await Product.find({ price: { $gt: 0 } })
      .select("name price stock")
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      priceMapSize: priceMap.size,
      updatedCount,
      totalProducts,
      pricedProducts,
      samplePriced,
    });
  } catch (error: any) {
    console.error("Fix prices error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
