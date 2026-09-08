import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";

export const dynamic = "force-dynamic";

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

    // 1. Read optional productId from URL params or POST JSON body
    let targetProductId: string | null = null;
    const { searchParams } = new URL(req.url);
    if (searchParams.get("productId")) {
      targetProductId = searchParams.get("productId");
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && body.productId) {
          targetProductId = body.productId;
        }
      } catch {
        // Body was empty or not JSON, proceed with all products
      }
    }

    // 2. Fetch products to reconcile
    const productQuery: any = {};
    if (targetProductId) {
      productQuery._id = targetProductId;
    }

    const products = await Product.find(productQuery).select("_id name stock");

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: targetProductId
          ? `Product not found with ID ${targetProductId}`
          : "No products found to reconcile",
        totalProductsChecked: 0,
        productsUpdatedCount: 0,
        stockLogsCorrectedCount: 0,
        details: [],
      });
    }

    let totalProductsUpdated = 0;
    let totalLogsCorrected = 0;
    const details: ReconcileResult[] = [];

    // 3. Process each product chronologically
    for (const product of products) {
      const pId = product._id;
      const logs = await StockLog.find({ product: pId }).sort({
        createdAt: 1,
        _id: 1,
      });

      const oldStock = Number(product.stock) || 0;

      // Case A: No stock logs exist
      if (!logs || logs.length === 0) {
        if (product.stock === undefined || product.stock === null || isNaN(product.stock)) {
          product.stock = 0;
          await product.save();
          totalProductsUpdated++;
          details.push({
            productId: pId.toString(),
            productName: product.name,
            oldStock,
            newStock: 0,
            stockChanged: true,
            totalLogs: 0,
            logsCorrected: 0,
          });
        }
        continue;
      }

      // Case B: Stock logs exist. Reconstruct the chronological ledger.
      // Determine the initial starting stock baseline before the first log
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
        // Fallback: derive from current stock minus total changes
        const totalNetChange = logs.reduce(
          (sum, l) => sum + (Number(l.change) || 0),
          0
        );
        initialStock = Math.max(0, oldStock - totalNetChange);
      }

      // Simulation pass: check if any log change would drop stock below 0
      let simBalance = initialStock;
      let minBalance = simBalance;
      for (const log of logs) {
        simBalance += Number(log.change) || 0;
        if (simBalance < minBalance) {
          minBalance = simBalance;
        }
      }

      // If simulated balance went negative, elevate baseline so stock doesn't drop below 0
      if (minBalance < 0) {
        initialStock += Math.abs(minBalance);
      }

      // Execution pass: calibrate previousStock & resultingStock on every log
      let runningStock = initialStock;
      let logsUpdatedForProduct = 0;

      for (const log of logs) {
        const prev = runningStock;
        const change = Number(log.change) || 0;
        const next = prev + change;

        const needsUpdate =
          log.previousStock !== prev || log.resultingStock !== next;

        if (needsUpdate) {
          log.previousStock = prev;
          log.resultingStock = next;
          await log.save();
          logsUpdatedForProduct++;
          totalLogsCorrected++;
        }

        runningStock = next;
      }

      // Ensure runningStock is not negative
      const finalStock = Math.max(0, runningStock);

      let stockChanged = false;
      if (product.stock !== finalStock) {
        product.stock = finalStock;
        await product.save();
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

    return NextResponse.json({
      success: true,
      message: "Stock reconciliation completed successfully.",
      totalProductsChecked: products.length,
      productsUpdatedCount: totalProductsUpdated,
      stockLogsCorrectedCount: totalLogsCorrected,
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
