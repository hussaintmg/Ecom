import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import Invoice from "@/models/Invoice";
import CreditSale from "@/models/CreditSale";
import "@/models/User";
import "@/models/Category";

export const dynamic = "force-dynamic";

interface ReconcileResult {
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  stockChanged: boolean;
  totalLogs: number;
  logsCorrected: number;
  correctedLogsPreview?: {
    logId: string;
    description: string;
    change: number;
    oldPrevious: number | undefined;
    newPrevious: number;
    oldResulting: number | undefined;
    newResulting: number;
  }[];
}

async function reconcileStockHandler(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    let targetProductId: string | null = searchParams.get("productId");

    if (!targetProductId && req.method === "POST") {
      try {
        const body = await req.json();
        if (body && body.productId) {
          targetProductId = body.productId;
        }
      } catch {
        // Body was empty or not JSON, proceed with all
      }
    }

    // =========================================================================
    // STEP 1: Fast in-memory price backfill from Invoices and CreditSales
    // =========================================================================
    let pricesUpdatedCount = 0;
    try {
      const invoices = await Invoice.find({})
        .select("products product quantity salePrice createdAt")
        .sort({ createdAt: 1 })
        .lean();

      const creditSales = await CreditSale.find({})
        .select("products createdAt")
        .sort({ createdAt: 1 })
        .lean();

      const priceMap = new Map<string, number>();

      for (const inv of invoices) {
        if (Array.isArray(inv.products)) {
          for (const item of inv.products) {
            const pId = item?.product?._id?.toString() || item?.product?.toString();
            const qty = Number(item.quantity) || 1;
            const saleP = Number(item.salePrice) || 0;
            if (pId && qty > 0 && saleP > 0) {
              const unitP = Math.round(saleP / qty);
              if (unitP > 0) priceMap.set(pId, unitP);
            }
          }
        }
        if (inv.product) {
          const pId = (inv.product as any)?._id?.toString() || inv.product.toString();
          const qty = Number(inv.quantity) || 1;
          const saleP = Number(inv.salePrice) || 0;
          if (pId && qty > 0 && saleP > 0) {
            const unitP = Math.round(saleP / qty);
            if (unitP > 0) priceMap.set(pId, unitP);
          }
        }
      }

      for (const cs of creditSales) {
        if (Array.isArray(cs.products)) {
          for (const item of cs.products) {
            const pId = item?.product?._id?.toString() || item?.product?.toString();
            const qty = Number(item.quantity) || 1;
            const saleP = Number(item.salePrice) || 0;
            if (pId && qty > 0 && saleP > 0) {
              const unitP = Math.round(saleP / qty);
              if (unitP > 0) priceMap.set(pId, unitP);
            }
          }
        }
      }

      const priceBulkOps = Array.from(priceMap.entries()).map(([pId, unitP]) => ({
        updateOne: {
          filter: { _id: pId, $or: [{ price: 0 }, { price: { $exists: false } }, { price: null }] },
          update: { $set: { price: unitP } },
        },
      }));

      if (priceBulkOps.length > 0) {
        const bulkRes = await Product.bulkWrite(priceBulkOps, { ordered: false });
        pricesUpdatedCount = bulkRes.modifiedCount || 0;
      }
    } catch (priceErr) {
      console.error("Error backfilling prices:", priceErr);
    }

    // =========================================================================
    // STEP 2: Fetch Stock Logs and Products in 2 bulk queries
    // =========================================================================
    const logQuery: any = {};
    if (targetProductId) {
      logQuery.product = targetProductId;
    }

    // Fetch all stock logs sorted chronologically
    const allLogs = await StockLog.find(logQuery)
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    // Group logs by productId in memory
    const logsByProduct = new Map<string, any[]>();
    for (const log of allLogs) {
      if (!log.product) continue;
      const pId = log.product.toString();
      if (!logsByProduct.has(pId)) {
        logsByProduct.set(pId, []);
      }
      logsByProduct.get(pId)!.push(log);
    }

    // Fetch all corresponding products in one bulk query
    const productIdsToFetch = targetProductId
      ? [targetProductId]
      : Array.from(logsByProduct.keys());

    const products = await Product.find({ _id: { $in: productIdsToFetch } })
      .select("_id name stock")
      .lean();

    const productMap = new Map<string, any>();
    for (const p of products) {
      productMap.set(p._id.toString(), p);
    }

    // Set null stock to 0 for products without logs
    await Product.updateMany(
      { $or: [{ stock: null }, { stock: { $exists: false } }] },
      { $set: { stock: 0 } }
    );

    // =========================================================================
    // STEP 3: Validate and compute exact chronological ledger for each product
    // =========================================================================
    const logBulkOps: any[] = [];
    const productBulkOps: any[] = [];
    const details: ReconcileResult[] = [];
    let totalLogsCorrected = 0;
    let totalProductsUpdated = 0;

    for (const [pId, logs] of logsByProduct.entries()) {
      const product = productMap.get(pId);
      if (!product) continue;

      const oldStock = Number(product.stock) || 0;
      if (!logs || logs.length === 0) continue;

      // Determine initial baseline before first log
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
          firstLog.description.toLowerCase().includes("bulk import") ||
          (Number(firstLog.change) > 0 && !hasValidPrev));

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

      // Simulation pass: ensure stock never dropped below 0
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

      // Reconstruct ledger pass
      let runningStock = initialStock;
      let productLogsCorrected = 0;
      const correctedLogsPreview: any[] = [];

      for (const log of logs) {
        const prev = runningStock;
        const change = Number(log.change) || 0;
        const next = Math.max(0, prev + change);

        const oldPrev = log.previousStock;
        const oldRes = log.resultingStock;

        const needsUpdate = oldPrev !== prev || oldRes !== next;

        if (needsUpdate) {
          logBulkOps.push({
            updateOne: {
              filter: { _id: log._id },
              update: { $set: { previousStock: prev, resultingStock: next } },
            },
          });
          productLogsCorrected++;
          totalLogsCorrected++;

          if (correctedLogsPreview.length < 5) {
            correctedLogsPreview.push({
              logId: log._id.toString(),
              description: log.description,
              change,
              oldPrevious: oldPrev,
              newPrevious: prev,
              oldResulting: oldRes,
              newResulting: next,
            });
          }
        }

        runningStock = next;
      }

      const finalStock = Math.max(0, runningStock);
      let stockChanged = false;

      if (oldStock !== finalStock) {
        productBulkOps.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: { stock: finalStock } },
          },
        });
        stockChanged = true;
        totalProductsUpdated++;
      }

      if (stockChanged || productLogsCorrected > 0) {
        details.push({
          productId: pId,
          productName: product.name,
          oldStock,
          newStock: finalStock,
          stockChanged,
          totalLogs: logs.length,
          logsCorrected: productLogsCorrected,
          correctedLogsPreview,
        });
      }
    }

    // =========================================================================
    // STEP 4: Atomically apply updates via bulkWrite
    // =========================================================================
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
      totalProductsWithLogs: logsByProduct.size,
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
