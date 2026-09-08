import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import Invoice from "@/models/Invoice";
import CreditSale from "@/models/CreditSale";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ReconcileResult {
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  stockChanged: boolean;
  totalLogs: number;
  logsCorrected: number;
}

async function reconcileStockHandler(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const onlyPrices =
      searchParams.get("only") === "prices" ||
      searchParams.get("action") === "prices";

    // 1. Backfill product prices from latest Invoices and CreditSales FIRST
    let pricesUpdatedCount = 0;
    try {
      const invoices = await Invoice.find({ "products.0": { $exists: true } })
        .sort({ createdAt: 1 })
        .lean();
      const creditSales = await CreditSale.find({ "products.0": { $exists: true } })
        .sort({ createdAt: 1 })
        .lean();

      const priceMap = new Map<string, number>();

      for (const inv of invoices) {
        if (Array.isArray(inv.products)) {
          for (const item of inv.products) {
            const rawProdId = (item as any)?.product?._id || (item as any)?.product;
            const qty = Number(item.quantity) || 1;
            const saleP = Number(item.salePrice) || 0;
            if (rawProdId && qty > 0 && saleP > 0) {
              const unitP = Math.round(saleP / qty);
              if (unitP > 0) {
                priceMap.set(rawProdId.toString(), unitP);
              }
            }
          }
        }
      }

      for (const cs of creditSales) {
        if (Array.isArray(cs.products)) {
          for (const item of cs.products) {
            const rawProdId = (item as any)?.product?._id || (item as any)?.product;
            const qty = Number(item.quantity) || 1;
            const saleP = Number(item.salePrice) || 0;
            if (rawProdId && qty > 0 && saleP > 0) {
              const unitP = Math.round(saleP / qty);
              if (unitP > 0) {
                priceMap.set(rawProdId.toString(), unitP);
              }
            }
          }
        }
      }

      for (const [pId, unitP] of priceMap.entries()) {
        const updateRes = await Product.updateOne(
          { _id: pId, $or: [{ price: 0 }, { price: { $exists: false } }] },
          { $set: { price: unitP } }
        );
        if (updateRes.modifiedCount > 0) {
          pricesUpdatedCount++;
        }
      }
    } catch (priceErr) {
      console.error("Error backfilling prices:", priceErr);
    }

    if (onlyPrices) {
      return NextResponse.json({
        success: true,
        message: "Product prices backfilled successfully from invoices and credit sales.",
        pricesUpdatedCount,
      });
    }

    // 2. Read optional productId from URL params or POST JSON body
    let targetProductId: string | null = null;
    if (searchParams.get("productId")) {
      targetProductId = searchParams.get("productId");
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && body.productId) {
          targetProductId = body.productId;
        }
      } catch {
        // Body was empty or not JSON, proceed
      }
    }

    // Ensure all products with null/undefined stock are set to 0 in one bulk query
    await Product.updateMany(
      { $or: [{ stock: null }, { stock: { $exists: false } }] },
      { $set: { stock: 0 } }
    );

    // 3. Fetch ONLY products that need ledger reconciliation
    const productQuery: any = {};
    if (targetProductId) {
      productQuery._id = targetProductId;
    } else {
      // High-performance optimization: only query products that have recorded stock logs
      const productIdsWithLogs = await StockLog.distinct("product");
      productQuery._id = { $in: productIdsWithLogs };
    }

    const products = await Product.find(productQuery).select("_id name stock").lean();

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: targetProductId
          ? `Product not found with ID ${targetProductId}`
          : "No products found to reconcile",
        totalProductsChecked: 0,
        productsUpdatedCount: 0,
        stockLogsCorrectedCount: 0,
        pricesUpdatedCount,
        details: [],
      });
    }

    let totalProductsUpdated = 0;
    let totalLogsCorrected = 0;
    const details: ReconcileResult[] = [];
    const logBulkOps: any[] = [];
    const productBulkOps: any[] = [];

    // 4. Process each product chronologically in memory
    for (const product of products) {
      const pId = product._id;
      const logs = await StockLog.find({ product: pId }).sort({
        createdAt: 1,
        _id: 1,
      });

      const oldStock = Number(product.stock) || 0;

      if (!logs || logs.length === 0) {
        continue;
      }

      // Reconstruct the chronological ledger
      const firstLog = logs[0];
      let initialStock = 0;

      const hasValidPrev =
        firstLog.previousStock !== undefined &&
        firstLog.previousStock !== null &&
        !isNaN(Number(firstLog.previousStock));

      const hasValidRes =
        firstLog.resultingStock !== undefined &&
        firstLog.resultingStock !== null &&
        !isNaN(Number(firstLog.resultingStock));

      const isInitialEntry =
        typeof firstLog.description === "string" &&
        (firstLog.description.toLowerCase().includes("initial") ||
          firstLog.description.toLowerCase().includes("opening") ||
          firstLog.description.toLowerCase().includes("bulk import"));

      if (isInitialEntry) {
        initialStock = 0;
      } else if (hasValidPrev) {
        initialStock = Number(firstLog.previousStock);
      } else if (hasValidRes && firstLog.change !== undefined) {
        initialStock = Number(firstLog.resultingStock) - Number(firstLog.change);
      } else {
        const totalNetChange = logs.reduce(
          (sum, l) => sum + (Number(l.change) || 0),
          0
        );
        initialStock = Math.max(0, oldStock - totalNetChange);
      }

      // Simulation pass
      let simBalance = initialStock;
      let minBalance = simBalance;
      for (const log of logs) {
        simBalance += Number(log.change) || 0;
        if (simBalance < minBalance) {
          minBalance = simBalance;
        }
      }

      if (minBalance < 0) {
        initialStock += Math.abs(minBalance);
      }

      // Execution pass: calibrate previousStock & resultingStock
      let runningStock = initialStock;
      let logsUpdatedForProduct = 0;

      for (const log of logs) {
        const prev = runningStock;
        const change = Number(log.change) || 0;
        const next = prev + change;

        const needsUpdate =
          log.previousStock !== prev || log.resultingStock !== next;

        if (needsUpdate) {
          logBulkOps.push({
            updateOne: {
              filter: { _id: log._id },
              update: { $set: { previousStock: prev, resultingStock: next } },
            },
          });
          logsUpdatedForProduct++;
          totalLogsCorrected++;
        }

        runningStock = next;
      }

      const finalStock = Math.max(0, runningStock);

      let stockChanged = false;
      if (product.stock !== finalStock) {
        productBulkOps.push({
          updateOne: {
            filter: { _id: pId },
            update: { $set: { stock: finalStock } },
          },
        });
        stockChanged = true;
        totalProductsUpdated++;
      }

      if (stockChanged || logsUpdatedForProduct > 0) {
        details.push({
          productId: pId.toString(),
          productName: product.name,
          oldStock,
          newStock: finalStock,
          stockChanged,
          totalLogs: logs.length,
          logsCorrected: logsUpdatedForProduct,
        });
      }
    }

    // Execute bulk updates in parallel
    const writePromises: Promise<any>[] = [];
    if (logBulkOps.length > 0) {
      writePromises.push(StockLog.bulkWrite(logBulkOps, { ordered: false }));
    }
    if (productBulkOps.length > 0) {
      writePromises.push(Product.bulkWrite(productBulkOps, { ordered: false }));
    }
    if (writePromises.length > 0) {
      await Promise.all(writePromises);
    }

    return NextResponse.json({
      success: true,
      message: "Stock and price reconciliation completed successfully.",
      totalProductsChecked: products.length,
      productsUpdatedCount: totalProductsUpdated,
      stockLogsCorrectedCount: totalLogsCorrected,
      pricesUpdatedCount,
      modifiedProducts: details,
    });
  } catch (error: any) {
    console.error("Stock reconciliation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to reconcile stock",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return reconcileStockHandler(req);
}

export async function GET(req: NextRequest) {
  return reconcileStockHandler(req);
}
