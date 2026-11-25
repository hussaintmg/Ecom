import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import { getUserFromRequest } from "@/utils/authHelpers";
import InventoryReceipt from "@/models/InventoryReceipt";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import "@/models/Product";
import "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    const receipt = await InventoryReceipt.findById(id)
      .populate("items.product", "name price images stock category barcode")
      .populate("receivedBy", "name email role");

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Stock receipt not found" },
        { status: 404 }
      );
    }

    // Fetch related stock movement history for this receipt
    const history = await StockLog.find({ receiptId: receipt._id })
      .populate("performedBy", "name email")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      receipt,
      history,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/receipts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch receipt details" },
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
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { vendor, receiptNumber, origin, vendorContact, notes, receivedAt, items } = body;

    const receipt = await InventoryReceipt.findById(id);
    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Stock receipt not found" },
        { status: 404 }
      );
    }

    if (receiptNumber && receiptNumber.trim() !== receipt.receiptNumber) {
      const existing = await InventoryReceipt.findOne({
        receiptNumber: receiptNumber.trim(),
        _id: { $ne: receipt._id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "Receipt reference number already exists" },
          { status: 400 }
        );
      }
      receipt.receiptNumber = receiptNumber.trim();
    }

    if (vendor !== undefined) receipt.vendor = vendor.trim() || receipt.vendor;
    if (origin !== undefined) receipt.origin = origin.trim() || receipt.origin;
    if (vendorContact !== undefined) receipt.vendorContact = vendorContact.trim();
    if (notes !== undefined) receipt.notes = notes.trim();
    if (receivedAt) {
      const parsedDate = new Date(receivedAt);
      if (!isNaN(parsedDate.getTime())) {
        receipt.receivedAt = parsedDate;
      }
    }

    // Update manifest items if provided
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: "Shipment must contain at least one product item." },
          { status: 400 }
        );
      }

      const existingMap = new Map<string, any>();
      for (const oldIt of receipt.items) {
        existingMap.set(String(oldIt._id), oldIt);
      }

      const incomingProductIds = Array.from(
        new Set(items.map((i: any) => String(i.productId || i.product?._id || i.product || "").trim()))
      ).filter(Boolean);

      const prodDocs = await Product.find({ _id: { $in: incomingProductIds } });
      const prodMap = new Map<string, any>();
      for (const p of prodDocs) {
        prodMap.set(p._id.toString(), p);
      }

      const keptExistingIds = new Set<string>();
      const nextItems: any[] = [];
      const pendingChanges: Array<{ prod: any; deltaPending: number }> = [];

      for (const rawItem of items) {
        const pid = String(rawItem.productId || rawItem.product?._id || rawItem.product || "").trim();
        const prodDoc = prodMap.get(pid);
        if (!prodDoc) {
          return NextResponse.json(
            { success: false, error: `Selected product not found (${pid}).` },
            { status: 404 }
          );
        }

        const newQty = Number(rawItem.qtyReceived ?? rawItem.quantity);
        if (!Number.isFinite(newQty) || !Number.isInteger(newQty) || newQty <= 0) {
          return NextResponse.json(
            { success: false, error: `Invalid received quantity for "${prodDoc.name}".` },
            { status: 400 }
          );
        }

        const unitCost = Math.max(0, Number(rawItem.unitCost || 0));
        const itemId = rawItem._id ? String(rawItem._id) : null;
        const existing = itemId ? existingMap.get(itemId) : null;

        if (existing) {
          keptExistingIds.add(itemId!);
          const processedQty = Number(existing.qtyGood || 0) + Number(existing.qtyDefective || 0);
          if (processedQty > 0 && String(existing.product) !== pid) {
            return NextResponse.json(
              {
                success: false,
                error: `Cannot replace product on an already-inspected row (${processedQty} units verified).`,
              },
              { status: 400 }
            );
          }
          if (newQty < processedQty) {
            return NextResponse.json(
              {
                success: false,
                error: `Quantity for "${prodDoc.name}" cannot be less than already inspected units (${processedQty}).`,
              },
              { status: 400 }
            );
          }

          const newPending = newQty - processedQty;
          const oldPending = Number(existing.qtyPending || 0);
          const status =
            newPending === 0 ? "Completed" : processedQty > 0 ? "Partially Inspected" : "Pending";

          nextItems.push({
            _id: existing._id,
            product: prodDoc._id,
            qtyReceived: newQty,
            qtyPending: newPending,
            qtyGood: Number(existing.qtyGood || 0),
            qtyDefective: Number(existing.qtyDefective || 0),
            unitCost,
            inspectionStatus: status,
          });

          if (newPending !== oldPending || String(existing.product) !== pid) {
            pendingChanges.push({ prod: prodDoc, deltaPending: newPending - oldPending });
          }
        } else {
          nextItems.push({
            product: prodDoc._id,
            qtyReceived: newQty,
            qtyPending: newQty,
            qtyGood: 0,
            qtyDefective: 0,
            unitCost,
            inspectionStatus: "Pending",
          });
          pendingChanges.push({ prod: prodDoc, deltaPending: newQty });
        }
      }

      // Guard removed rows: cannot remove a row with existing inspections
      for (const [oldId, oldIt] of existingMap.entries()) {
        if (!keptExistingIds.has(oldId)) {
          const processedQty = Number(oldIt.qtyGood || 0) + Number(oldIt.qtyDefective || 0);
          if (processedQty > 0) {
            return NextResponse.json(
              {
                success: false,
                error: `Cannot remove an item that already has ${processedQty} Good/Defective inspected units.`,
              },
              { status: 400 }
            );
          }
        }
      }

      receipt.items = nextItems as any;

      let totalPending = 0;
      let totalInspected = 0;
      for (const it of receipt.items) {
        totalPending += Number(it.qtyPending || 0);
        totalInspected += Number(it.qtyGood || 0) + Number(it.qtyDefective || 0);
      }
      receipt.status =
        totalPending === 0
          ? "Inspection Completed"
          : totalInspected > 0
          ? "Partially Inspected"
          : "Pending Inspection";

      for (const ch of pendingChanges) {
        await StockLog.create({
          product: ch.prod._id,
          change: 0,
          previousStock: ch.prod.stock,
          resultingStock: ch.prod.stock,
          quantity: Math.abs(ch.deltaPending),
          movementType: "receiving_pending",
          fromState: "receiving",
          toState: "pending",
          receiptId: receipt._id,
          performedBy: user.id,
          description: `Shipment Updated (${receipt.receiptNumber}): ${ch.prod.name} pending adjusted (${
            ch.deltaPending >= 0 ? "+" : ""
          }${ch.deltaPending})`,
        });
      }
    }

    await receipt.save();

    const populated = await InventoryReceipt.findById(receipt._id)
      .populate("items.product", "name price images stock category barcode")
      .populate("receivedBy", "name email role");

    return NextResponse.json({
      success: true,
      message: "Shipment details updated successfully",
      receipt: populated,
    });
  } catch (error: any) {
    console.error("PUT /api/inventory/receipts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update receipt" },
      { status: 500 }
    );
  }
}
