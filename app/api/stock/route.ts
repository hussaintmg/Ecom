import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import StockLog from "@/models/StockLog";
import Product from "@/models/Product";
import { getUserFromRequest } from "@/utils/authHelpers";
import { MAX_STOCK_CHANGE } from "@/constants/stock";

// POST: add a stock log entry and update product stock.
// Accepts either:
//   { productId, change, description }          → relative adjustment (+/-)
//   { productId, setTo, description }           → correct stock to an exact value
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { productId, change, setTo, description } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    if (!description || !String(description).trim()) {
      return NextResponse.json(
        { error: "A reason/description is required for every stock change" },
        { status: 400 }
      );
    }

    const usingSetTo = setTo !== undefined && setTo !== null && setTo !== "";
    if (!usingSetTo && (change === undefined || change === null || change === "")) {
      return NextResponse.json(
        { error: "Provide either a stock change or an exact stock value" },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const previousStock = product.stock;

    // Resolve the requested change (server-side, so "set to X" can never race
    // against another admin's update).
    let delta: number;
    if (usingSetTo) {
      const target = Number(setTo);
      if (!Number.isFinite(target) || !Number.isInteger(target)) {
        return NextResponse.json(
          { error: "Exact stock value must be a whole number" },
          { status: 400 }
        );
      }
      if (target < 0) {
        return NextResponse.json(
          { error: "Stock cannot be set below 0" },
          { status: 400 }
        );
      }
      if (target > MAX_STOCK_CHANGE) {
        return NextResponse.json(
          { error: `Stock cannot be set above ${MAX_STOCK_CHANGE.toLocaleString()}` },
          { status: 400 }
        );
      }
      delta = target - previousStock;
      if (delta === 0) {
        return NextResponse.json(
          { error: `Stock is already ${target}. Nothing to correct.` },
          { status: 400 }
        );
      }
    } else {
      delta = Number(change);
      if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
        return NextResponse.json(
          { error: "Stock change must be a whole number" },
          { status: 400 }
        );
      }
      if (delta === 0) {
        return NextResponse.json(
          { error: "Stock change cannot be zero" },
          { status: 400 }
        );
      }
      if (Math.abs(delta) > MAX_STOCK_CHANGE) {
        return NextResponse.json(
          {
            error: `A single stock change cannot exceed ${MAX_STOCK_CHANGE.toLocaleString()} units. Please check the amount.`,
          },
          { status: 400 }
        );
      }
    }

    const newStock = previousStock + delta;
    if (newStock < 0) {
      return NextResponse.json(
        {
          error: `Cannot remove ${Math.abs(delta)} units — only ${previousStock} in stock.`,
        },
        { status: 400 }
      );
    }

    product.stock = newStock;
    await product.save();

    const log = await StockLog.create({
      product: productId,
      change: delta,
      description: String(description).trim(),
      previousStock,
      resultingStock: newStock,
      performedBy: user.id,
    });

    return NextResponse.json(log);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
