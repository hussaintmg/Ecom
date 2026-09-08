import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import Invoice from "@/models/Invoice";
import CreditSale from "@/models/CreditSale";
import "@/models/User";
import "@/models/Category";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CorrectedLogPreview {
  logId: string;
  description: string;
  change: number;
  oldPrevious: number | undefined;
  newPrevious: number;
  oldResulting: number | undefined;
  newResulting: number;
  date?: string;
}

interface ReconcileResult {
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  stockChanged: boolean;
  totalLogs: number;
  logsCorrected: number;
  correctedLogsPreview: CorrectedLogPreview[];
}

async function reconcileStockHandler(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    let targetProductId: string | null = searchParams.get("productId");

    if (!targetProductId && req.method === "POST") {
      try {
        const body = await req.json();
        if (body && body.productId) {
          targetProductId = body.productId;
        }
      } catch {
        // Empty or non-JSON body
      }
    }

    // =========================================================================
    // STEP 1: Fast targeted discovery of products with activity
    // To avoid full table scans across 15,000+ products (which cause serverless timeouts),
    // we query Invoices (184 docs) and CreditSales (28 docs) where sales occur.
    // =========================================================================
    const [invoices, creditSales] = await Promise.all([
      Invoice.find({}).select("products.product product quantity salePrice").lean(),
      CreditSale.find({}).select("products.product quantity salePrice").lean(),
    ]);

    const activeProductIds = new Set<string>();
    const priceMap = new Map<string, number>();

    for (const inv of invoices) {
      if (Array.isArray(inv.products)) {
        for (const item of inv.products) {
          const pId = item?.product?._id?.toString() || item?.product?.toString();
          const qty = Number(item.quantity) || 1;
          const saleP = Number(item.salePrice) || 0;
          if (pId) {
            activeProductIds.add(pId);
            if (qty > 0 && saleP > 0) {
              const unitP = Math.round(saleP / qty);
              if (unitP > 0) priceMap.set(pId, unitP);
            }
          }
        }
      }
      if (inv.product) {
        const pId = (inv.product as any)?._id?.toString() || inv.product.toString();
        const qty = Number(inv.quantity) || 1;
        const saleP = Number(inv.salePrice) || 0;
        if (pId) {
          activeProductIds.add(pId);
          if (qty > 0 && saleP > 0) {
            const unitP = Math.round(saleP / qty);
            if (unitP > 0) priceMap.set(pId, unitP);
          }
        }
      }
    }

    for (const cs of creditSales) {
      if (Array.isArray(cs.products)) {
        for (const item of cs.products) {
          const pId = item?.product?._id?.toString() || item?.product?.toString();
          const qty = Number(item.quantity) || 1;
          const saleP = Number(item.salePrice) || 0;
          if (pId) {
            activeProductIds.add(pId);
            if (qty > 0 && saleP > 0) {
              const unitP = Math.round(saleP / qty);
              if (unitP > 0) priceMap.set(pId, unitP);
            }
          }
        }
      }
    }

    if (action === "diagnostic") {
      return NextResponse.json({
        success: true,
        diagnostic: {
          totalInvoices: invoices.length,
          totalCreditSales: creditSales.length,
          uniqueProductsWithSales: activeProductIds.size,
          pricesToBackfill: priceMap.size,
        },
      });
    }

    const targetProductIds = targetProductId
      ? [targetProductId]
      : Array.from(activeProductIds);

    // =========================================================================
    // STEP 2: Fetch Stock Logs and Products using indexed primary/foreign keys
    // =========================================================================
    const [allLogs, products] = await Promise.all([
      StockLog.find({ product: { $in: targetProductIds } })
        .select("_id product change previousStock resultingStock createdAt description")
        .lean(),
      Product.find({ _id: { $in: targetProductIds } })
        .select("_id name stock price")
        .lean(),
    ]);

    // Group logs by productId
    const logsByProduct = new Map<string, any[]>();
    for (const log of allLogs) {
      if (!log.product) continue;
      const pId = log.product.toString();
      if (!logsByProduct.has(pId)) {
        logsByProduct.set(pId, []);
      }
      logsByProduct.get(pId)!.push(log);
    }

    const productMap = new Map<string, any>();
    for (const p of products) {
      productMap.set(p._id.toString(), p);
    }

    // =========================================================================
    // STEP 3: Chronological Ledger Validation & Correction
    // Validates each log sequentially:
    //   expectedPreviousStock = runningStock
    //   expectedResultingStock = Math.max(0, runningStock + change)
    // If a log's recorded previousStock or resultingStock does not match,
    // it is corrected. At the end, product.stock is set to final runningStock.
    // =========================================================================
    const logBulkOps: any[] = [];
    const productBulkOps: any[] = [];
    const priceBulkOps: any[] = [];
    const modifiedProducts: ReconcileResult[] = [];
    let totalLogsCorrected = 0;
    let totalProductsUpdated = 0;
    let pricesUpdatedCount = 0;

    // Check prices for target products
    for (const p of products) {
      const pId = p._id.toString();
      const currentP = Number(p.price) || 0;
      const discoveredP = priceMap.get(pId);
      if (currentP === 0 && discoveredP && discoveredP > 0) {
        priceBulkOps.push({
          updateOne: {
            filter: { _id: p._id, $or: [{ price: 0 }, { price: { $exists: false } }, { price: null }] },
            update: { $set: { price: discoveredP } },
          },
        });
      }
    }

    for (const [pId, rawLogs] of logsByProduct.entries()) {
      const product = productMap.get(pId);
      if (!product) continue;

      const oldStock = Number(product.stock) || 0;
      if (!rawLogs || rawLogs.length === 0) continue;

      // Sort logs deterministically in memory: createdAt ASC, then _id ASC
      const logs = [...rawLogs].sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return String(a._id).localeCompare(String(b._id));
      });

      // ── Determine Initial Stock Baseline before the first log ──
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

      const firstChange = Number(firstLog.change) || 0;

      // Check if first log was an initial stock addition (e.g. +4 resulting in 4, or opening stock)
      if (hasValidRes && firstChange > 0 && Number(firstLog.resultingStock) === firstChange) {
        initialStock = 0;
      } else if (
        typeof firstLog.description === "string" &&
        (firstLog.description.toLowerCase().includes("initial") ||
          firstLog.description.toLowerCase().includes("opening") ||
          firstLog.description.toLowerCase().includes("bulk import"))
      ) {
        initialStock = 0;
      } else if (hasValidPrev) {
        initialStock = Math.max(0, Number(firstLog.previousStock));
      } else if (hasValidRes) {
        initialStock = Math.max(0, Number(firstLog.resultingStock) - firstChange);
      } else {
        const totalNetChange = logs.reduce(
          (sum, l) => sum + (Number(l.change) || 0),
          0
        );
        initialStock = Math.max(0, oldStock - totalNetChange);
      }

      // Simulation pass: ensure running stock never dipped below 0
      let simBalance = initialStock;
      let minBalance = simBalance;
      for (const log of logs) {
        const c = Number(log.change) || 0;
        simBalance += c;
        if (simBalance < minBalance) {
          minBalance = simBalance;
        }
      }
      if (minBalance < 0) {
        initialStock += Math.abs(minBalance);
      }

      // ── Reconstruct and Validate Full Ledger ──
      let runningStock = initialStock;
      let productLogsCorrected = 0;
      const correctedLogsPreview: CorrectedLogPreview[] = [];

      for (const log of logs) {
        const prev = runningStock;
        const change = Number(log.change) || 0;
        const next = Math.max(0, prev + change);

        const oldPrev = log.previousStock;
        const oldRes = log.resultingStock;

        // Check for mismatch: log needs update if previousStock or resultingStock is corrupted/inconsistent
        const prevMismatch = oldPrev === undefined || oldPrev === null || Number(oldPrev) !== prev;
        const resMismatch = oldRes === undefined || oldRes === null || Number(oldRes) !== next;

        if (prevMismatch || resMismatch) {
          logBulkOps.push({
            updateOne: {
              filter: { _id: log._id },
              update: { $set: { previousStock: prev, resultingStock: next } },
            },
          });
          productLogsCorrected++;
          totalLogsCorrected++;

          correctedLogsPreview.push({
            logId: log._id.toString(),
            description: log.description,
            change,
            oldPrevious: oldPrev,
            newPrevious: prev,
            oldResulting: oldRes,
            newResulting: next,
            date: log.createdAt ? new Date(log.createdAt).toISOString() : undefined,
          });
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
        modifiedProducts.push({
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
    // Only operations with validated discrepancies are executed.
    // If no discrepancies found, zero database writes are made.
    // =========================================================================
    const writePromises: Promise<any>[] = [];
    if (logBulkOps.length > 0) {
      writePromises.push(StockLog.bulkWrite(logBulkOps, { ordered: false }));
    }
    if (productBulkOps.length > 0) {
      writePromises.push(Product.bulkWrite(productBulkOps, { ordered: false }));
    }
    if (priceBulkOps.length > 0) {
      writePromises.push(
        Product.bulkWrite(priceBulkOps, { ordered: false }).then((r) => {
          pricesUpdatedCount = r.modifiedCount || 0;
        })
      );
    }
    if (writePromises.length > 0) {
      await Promise.all(writePromises);
    }

    return NextResponse.json({
      success: true,
      message: "Stock and price reconciliation completed successfully.",
      summary: {
        totalTargetProducts: targetProductIds.length,
        productsWithLogs: logsByProduct.size,
        productsUpdatedCount: totalProductsUpdated,
        stockLogsExamined: allLogs.length,
        stockLogsCorrectedCount: totalLogsCorrected,
        pricesUpdatedCount,
      },
      modifiedProducts,
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
