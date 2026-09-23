import mongoose from "mongoose";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import Invoice from "@/models/Invoice";
import InventoryReceipt from "@/models/InventoryReceipt";
import DefectiveInventory from "@/models/DefectiveInventory";
import RepairJob from "@/models/RepairJob";
import Category from "@/models/Category";
import User from "@/models/User";

// Ensure models are registered
const ensureModels = () => {
  void Product;
  void StockLog;
  void Invoice;
  void InventoryReceipt;
  void DefectiveInventory;
  void RepairJob;
  void Category;
  void User;
};

export interface ReceiveItemInput {
  productId: string;
  sku?: string;
  quantity?: number;
  qtyReceived?: number;
  unitCost?: number;
}

export interface ReceiveStockInput {
  referenceNumber?: string;
  vendor?: string;
  origin?: string;
  vendorContact?: string;
  receivedAt?: string | Date;
  notes?: string;
  items: ReceiveItemInput[];
}

export interface MarkGoodInput {
  receiptId: string;
  itemId: string;
  quantity: number;
  notes?: string;
}

export interface MarkDefectiveInput {
  receiptId: string;
  itemId: string;
  quantity: number;
  defectReason: string;
  description?: string;
}

export interface StartRepairInput {
  defectiveId: string;
  quantity: number;
  technicianOrVendor?: string;
  estimatedCost?: number;
  notes?: string;
}

export interface CompleteRepairInput {
  repairJobId: string;
  successfulQty: number;
  failedQty: number;
  actualCost?: number;
  notes?: string;
}

export interface SellDefectiveInput {
  defectiveId: string;
  quantity: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerNote?: string;
  salePrice: number;
  notes?: string;
}

export interface ScrapDefectiveInput {
  defectiveId: string;
  quantity: number;
  reason: string;
  scrapRecoveryValue?: number;
  notes?: string;
}

export interface BulkSellDefectiveItem {
  defectiveId: string;
  quantity: number;
  salePrice: number;
  notes?: string;
}

export interface BulkSellDefectiveInput {
  items: BulkSellDefectiveItem[];
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerNote?: string;
  notes?: string;
}

export interface BulkScrapDefectiveItem {
  defectiveId: string;
  quantity: number;
  reason: string;
  scrapRecoveryValue?: number;
  notes?: string;
}

export interface BulkScrapDefectiveInput {
  items: BulkScrapDefectiveItem[];
}

export interface BulkRepairDefectiveItem {
  defectiveId: string;
  quantity: number;
  technicianOrVendor?: string;
  estimatedCost?: number;
  notes?: string;
}

export interface BulkRepairDefectiveInput {
  items: BulkRepairDefectiveItem[];
}

export interface DispatchRepairItemInput {
  defectiveId: string;
  quantity: number;
  defectReason?: string;
  estimatedCost?: number;
  notes?: string;
}

export interface DispatchRepairVendorInput {
  vendorName: string;
  vendorPhone?: string;
  vendorAddress?: string;
  expectedReturnDate?: string | Date;
  notes?: string;
  items: DispatchRepairItemInput[];
}

export interface ReturnDefectiveToReceivingInput {
  defectiveId: string;
  quantity: number;
  notes?: string;
}

export interface BulkReturnDefectiveItem {
  defectiveId: string;
  quantity: number;
  notes?: string;
}

export interface BulkReturnDefectiveToReceivingInput {
  items: BulkReturnDefectiveItem[];
  notes?: string;
}

export interface MoveDefectiveToGoodInput {
  defectiveId: string;
  quantity: number;
  notes?: string;
}

export interface BulkMoveDefectiveItem {
  defectiveId: string;
  quantity: number;
  notes?: string;
}

export interface BulkMoveDefectiveToGoodInput {
  items: BulkMoveDefectiveItem[];
  notes?: string;
}

export class InventoryService {
  /**
   * 1. Receive new physical stock into "Pending Inspection".
   * Invariant: Normal sellable stock (`Product.stock`) does NOT increase immediately.
   */
  static async receiveStock(input: ReceiveStockInput, userId?: string) {
    await connectDB();
    ensureModels();

    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("At least one product item is required for receiving stock.");
    }

    // Validate items and generate reference number if omitted
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber =
      input.referenceNumber && input.referenceNumber.trim()
        ? input.referenceNumber.trim()
        : `REC-${dateStr}-${randomSuffix}`;

    const receiptItems = [];

    for (const it of input.items) {
      const qty = Number(it.quantity !== undefined ? it.quantity : (it as any).qtyReceived);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
        throw new Error("Received quantity must be a positive whole number.");
      }
      const unitCost = Number(it.unitCost || 0);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        throw new Error("Unit cost cannot be negative.");
      }

      const product = await Product.findById(it.productId);
      if (!product) {
        throw new Error(`Product not found with ID: ${it.productId}`);
      }

      receiptItems.push({
        product: product._id,
        qtyReceived: qty,
        qtyPending: qty,
        qtyGood: 0,
        qtyDefective: 0,
        unitCost,
        inspectionStatus: "Pending",
      });
    }

    const receipt = await InventoryReceipt.create({
      receiptNumber,
      vendor: input.vendor?.trim() || "Direct Supplier",
      origin: input.origin?.trim() || "General",
      vendorContact: input.vendorContact?.trim() || "",
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : now,
      receivedBy: userId || null,
      notes: input.notes?.trim() || "",
      status: "Pending Inspection",
      items: receiptItems,
    });

    // Create a StockLog for each received item recording that pending stock arrived
    for (const it of receipt.items) {
      const prod = await Product.findById(it.product);
      if (!prod) continue;
      await StockLog.create({
        product: prod._id,
        change: 0, // Sellable stock remains unchanged
        description: `Shipment Received (${receipt.receiptNumber}): +${it.qtyReceived} units entering Pending Inspection`,
        previousStock: prod.stock,
        resultingStock: prod.stock,
        quantity: it.qtyReceived,
        movementType: "receiving_pending",
        fromState: "receiving",
        toState: "pending",
        receiptId: receipt._id,
        performedBy: userId || null,
        notes: receipt.notes,
      });
    }

    const populated = await InventoryReceipt.findById(receipt._id)
      .populate("items.product", "name price images stock category barcode")
      .populate("receivedBy", "name email");

    return populated;
  }

  /**
   * Helper to re-evaluate and persist receipt and item statuses.
   */
  private static async syncReceiptStatus(receiptId: string | mongoose.Types.ObjectId) {
    const receipt = await InventoryReceipt.findById(receiptId);
    if (!receipt) return null;

    let totalPending = 0;
    let totalInspected = 0;

    for (const item of receipt.items) {
      if (item.qtyPending === 0) {
        item.inspectionStatus = "Completed";
      } else if (item.qtyGood > 0 || item.qtyDefective > 0) {
        item.inspectionStatus = "Partially Inspected";
      } else {
        item.inspectionStatus = "Pending";
      }
      totalPending += item.qtyPending;
      totalInspected += (item.qtyGood + item.qtyDefective);
    }

    if (totalPending === 0) {
      receipt.status = "Inspection Completed";
    } else if (totalInspected > 0) {
      receipt.status = "Partially Inspected";
    } else {
      receipt.status = "Pending Inspection";
    }

    await receipt.save();
    return receipt;
  }

  /**
   * 2. Mark received item as "Good".
   * Decreases pending quantity, increases existing sellable stock (`Product.stock`).
   * Concurrency safe: atomic conditional check ensures pending >= quantity.
   */
  static async markGood(input: MarkGoodInput, userId?: string) {
    await connectDB();
    ensureModels();

    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      throw new Error("Quantity must be a positive whole number.");
    }

    // Atomic conditional decrement of pending quantity
    const updatedReceipt = await InventoryReceipt.findOneAndUpdate(
      {
        _id: input.receiptId,
        "items._id": input.itemId,
        "items.qtyPending": { $gte: qty },
      },
      {
        $inc: {
          "items.$.qtyPending": -qty,
          "items.$.qtyGood": qty,
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedReceipt) {
      throw new Error(
        "Cannot mark good: Either receipt item was not found, or remaining pending quantity is less than requested."
      );
    }

    const item = updatedReceipt.items.find((i: any) => String(i._id) === String(input.itemId));
    if (!item) {
      throw new Error("Receipt item not found after update.");
    }

    // Atomically increment sellable stock on the Product
    const prevProduct = await Product.findOneAndUpdate(
      { _id: item.product },
      { $inc: { stock: qty } },
      { returnDocument: "before" }
    );

    if (!prevProduct) {
      throw new Error("Product record not found.");
    }

    const previousStock = prevProduct.stock;
    const resultingStock = previousStock + qty;

    // Create StockLog
    await StockLog.create({
      product: item.product,
      change: qty, // Positive increase to sellable stock
      description: `Quality Inspection Passed (Good): +${qty} units from receipt ${updatedReceipt.receiptNumber}`,
      previousStock,
      resultingStock,
      quantity: qty,
      movementType: "inspection_good",
      fromState: "pending",
      toState: "sellable",
      receiptId: updatedReceipt._id,
      performedBy: userId || null,
      notes: input.notes?.trim() || "",
    });

    await this.syncReceiptStatus(updatedReceipt._id);

    return {
      success: true,
      receiptNumber: updatedReceipt.receiptNumber,
      qtyGood: qty,
      newSellableStock: resultingStock,
    };
  }

  /**
   * 3. Mark received item as "Defective".
   * Decreases pending quantity, increases Defective Inventory.
   * Invariant: Normal sellable stock (`Product.stock`) remains unchanged.
   */
  static async markDefective(input: MarkDefectiveInput, userId?: string) {
    await connectDB();
    ensureModels();

    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      throw new Error("Quantity must be a positive whole number.");
    }

    if (!input.defectReason || !input.defectReason.trim()) {
      throw new Error("Defect reason is required.");
    }

    // Atomic conditional decrement of pending quantity
    const updatedReceipt = await InventoryReceipt.findOneAndUpdate(
      {
        _id: input.receiptId,
        "items._id": input.itemId,
        "items.qtyPending": { $gte: qty },
      },
      {
        $inc: {
          "items.$.qtyPending": -qty,
          "items.$.qtyDefective": qty,
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedReceipt) {
      throw new Error(
        "Cannot mark defective: Either receipt item was not found, or remaining pending quantity is less than requested."
      );
    }

    const item = updatedReceipt.items.find((i: any) => String(i._id) === String(input.itemId));
    if (!item) {
      throw new Error("Receipt item not found after update.");
    }

    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error("Product record not found.");
    }

    // Create a new defective inventory batch record referencing the master product
    const defectiveRecord = await DefectiveInventory.create({
      product: product._id,
      receipt: updatedReceipt._id,
      receiptItemId: item._id,
      originalQuantity: qty,
      availableDefectiveQuantity: qty,
      quantityRepairing: 0,
      quantitySold: 0,
      quantityScrapped: 0,
      originalUnitCost: item.unitCost || 0,
      repairCostSpent: 0,
      defectReason: input.defectReason.trim(),
      description: input.description?.trim() || "",
      status: "Awaiting Decision",
    });

    // Create StockLog (sellable stock unchanged)
    await StockLog.create({
      product: product._id,
      change: 0,
      description: `Quality Inspection: ${qty} units marked Defective (${input.defectReason}) from receipt ${updatedReceipt.receiptNumber}`,
      previousStock: product.stock,
      resultingStock: product.stock,
      quantity: qty,
      movementType: "inspection_defective",
      fromState: "pending",
      toState: "defective",
      receiptId: updatedReceipt._id,
      defectiveId: defectiveRecord._id,
      performedBy: userId || null,
      notes: input.description?.trim() || "",
    });

    await this.syncReceiptStatus(updatedReceipt._id);

    return {
      success: true,
      receiptNumber: updatedReceipt.receiptNumber,
      defectiveId: defectiveRecord._id,
      defectiveRecord,
      remainingPending: item.qtyPending,
      qtyDefective: qty,
      sellableStock: product.stock,
    };
  }

  /**
   * 4. Send defective stock to Repair.
   * Decreases available defective quantity, increases quantity in repair.
   * Invariant: Normal sellable stock (`Product.stock`) remains unchanged.
   */
  static async startRepair(input: StartRepairInput, userId?: string) {
    await connectDB();
    ensureModels();

    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      throw new Error("Quantity to repair must be a positive whole number.");
    }

    const estCost = Number(input.estimatedCost || 0);
    if (!Number.isFinite(estCost) || estCost < 0) {
      throw new Error("Estimated cost cannot be negative.");
    }

    // Atomic conditional decrement of available defective quantity
    const defective = await DefectiveInventory.findOneAndUpdate(
      {
        _id: input.defectiveId,
        availableDefectiveQuantity: { $gte: qty },
      },
      {
        $inc: {
          availableDefectiveQuantity: -qty,
          quantityRepairing: qty,
        },
        $set: {
          status: "In Repair",
        },
      },
      { returnDocument: "after" }
    );

    if (!defective) {
      throw new Error(
        "Cannot start repair: Available defective quantity is insufficient or entry not found."
      );
    }

    // If remaining available is > 0, status is Partially In Repair
    if (defective.availableDefectiveQuantity > 0) {
      defective.status = "Partially In Repair";
      await defective.save();
    }

    const repairJob = await RepairJob.create({
      defectiveInventory: defective._id,
      product: defective.product,
      quantity: qty,
      quantityRepaired: 0,
      quantityFailed: 0,
      technicianOrVendor: input.technicianOrVendor?.trim() || "In-house",
      estimatedCost: estCost,
      actualCost: 0,
      startDate: new Date(),
      notes: input.notes?.trim() || "",
      status: "In Progress",
    });

    const product = await Product.findById(defective.product);

    // StockLog entry
    await StockLog.create({
      product: defective.product,
      change: 0,
      description: `Sent to Repair: ${qty} units (${repairJob.technicianOrVendor})`,
      previousStock: product?.stock || 0,
      resultingStock: product?.stock || 0,
      quantity: qty,
      movementType: "repair_start",
      fromState: "defective",
      toState: "repairing",
      defectiveId: defective._id,
      repairJobId: repairJob._id,
      performedBy: userId || null,
      notes: input.notes?.trim() || "",
    });

    return {
      success: true,
      repairJob,
      defective,
    };
  }

  /**
   * 5. Complete repair job with partial/full success/failure.
   * Concurrency-safe:
   * - Validates: `successfulQty + failedQty === repairJob.quantity`.
   * - Successful items move to normal sellable stock (`Product.stock`).
   * - Failed items return to available defective stock (`DefectiveInventory.availableDefectiveQuantity`).
   */
  static async completeRepair(input: CompleteRepairInput, userId?: string) {
    await connectDB();
    ensureModels();

    const successQty = Number(input.successfulQty || 0);
    const failQty = Number(input.failedQty || 0);

    if (!Number.isFinite(successQty) || !Number.isInteger(successQty) || successQty < 0) {
      throw new Error("Successful quantity must be a non-negative whole number.");
    }
    if (!Number.isFinite(failQty) || !Number.isInteger(failQty) || failQty < 0) {
      throw new Error("Failed quantity must be a non-negative whole number.");
    }
    if (successQty === 0 && failQty === 0) {
      throw new Error("At least one outcome quantity (successful or failed) must be greater than zero.");
    }

    const actualCost = Number(input.actualCost || 0);
    if (!Number.isFinite(actualCost) || actualCost < 0) {
      throw new Error("Actual repair cost cannot be negative.");
    }

    // Atomically find repair job only if status is "In Progress" to prevent double-completion
    const repairJob = await RepairJob.findOneAndUpdate(
      {
        _id: input.repairJobId,
        status: "In Progress",
      },
      {
        $set: {
          quantityRepaired: successQty,
          quantityFailed: failQty,
          actualCost,
          completionDate: new Date(),
          status:
            successQty > 0 && failQty === 0
              ? "Successfully Repaired"
              : successQty > 0
              ? "Partially Repaired"
              : "Failed",
          notes: input.notes?.trim() || "",
        },
      },
      { returnDocument: "after" }
    );

    if (!repairJob) {
      throw new Error(
        "Repair job not found or already completed/processed."
      );
    }

    if (successQty + failQty !== repairJob.quantity) {
      // Revert job back to in progress before throwing validation error
      repairJob.status = "In Progress";
      await repairJob.save();
      throw new Error(
        `Total outcome (${successQty} success + ${failQty} failed = ${successQty + failQty}) must equal repair job quantity (${repairJob.quantity}).`
      );
    }

    const defective = await DefectiveInventory.findById(repairJob.defectiveInventory);
    if (!defective) {
      throw new Error("Defective inventory batch not found.");
    }

    // Decrement repairing quantity by total job quantity, and return failed quantity back to available defective
    defective.quantityRepairing = Math.max(0, defective.quantityRepairing - repairJob.quantity);
    if (failQty > 0) {
      defective.availableDefectiveQuantity += failQty;
    }
    defective.repairCostSpent = (defective.repairCostSpent || 0) + actualCost;

    // Recalculate defective status
    if (defective.availableDefectiveQuantity === 0 && defective.quantityRepairing === 0) {
      defective.status = "Closed";
    } else if (defective.quantityRepairing > 0) {
      defective.status = "In Repair";
    } else if (failQty > 0) {
      defective.status = "Repair Failed";
    } else {
      defective.status = "Repair Completed";
    }
    await defective.save();

    let newSellableStock = 0;

    // If any items were successfully repaired, increment sellable Product.stock
    if (successQty > 0) {
      const prevProd = await Product.findOneAndUpdate(
        { _id: defective.product },
        { $inc: { stock: successQty } },
        { returnDocument: "before" }
      );
      const prevStock = prevProd ? prevProd.stock : 0;
      newSellableStock = prevStock + successQty;

      await StockLog.create({
        product: defective.product,
        change: successQty,
        description: `Repair Completed Successfully: +${successQty} units returned to Sellable stock (Cost: Rs. ${actualCost.toLocaleString()})`,
        previousStock: prevStock,
        resultingStock: newSellableStock,
        quantity: successQty,
        movementType: "repair_success",
        fromState: "repairing",
        toState: "sellable",
        defectiveId: defective._id,
        repairJobId: repairJob._id,
        performedBy: userId || null,
        notes: input.notes?.trim() || "",
      });
    }

    // If any items failed repair, log movement back to defective
    if (failQty > 0) {
      const currentProd = await Product.findById(defective.product);
      await StockLog.create({
        product: defective.product,
        change: 0,
        description: `Repair Failed: ${failQty} units returned to Defective stock`,
        previousStock: currentProd?.stock || 0,
        resultingStock: currentProd?.stock || 0,
        quantity: failQty,
        movementType: "repair_failed",
        fromState: "repairing",
        toState: "defective",
        defectiveId: defective._id,
        repairJobId: repairJob._id,
        performedBy: userId || null,
        notes: input.notes?.trim() || "",
      });
    }

    return {
      success: true,
      repairJob,
      defective,
      newSellableStock,
    };
  }

  /**
   * 6. Sell defective stock as-is (Defective Sale).
   * Concurrency-safe:
   * - Decreases `DefectiveInventory.availableDefectiveQuantity`.
   * - Directly creates an existing `Invoice` with `stockAlreadyDeducted: true`.
   * - Invariant: Normal sellable stock (`Product.stock`) is NEVER touched.
   */
  static async sellDefective(input: SellDefectiveInput, userId: string) {
    await connectDB();
    ensureModels();

    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      throw new Error("Quantity to sell must be a positive whole number.");
    }

    const price = Number(input.salePrice);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Total sale price must be greater than zero.");
    }

    if (!input.customerName || !input.customerName.trim()) {
      throw new Error("Customer name is required.");
    }

    // Atomic conditional decrement of available defective stock
    const defective = await DefectiveInventory.findOneAndUpdate(
      {
        _id: input.defectiveId,
        availableDefectiveQuantity: { $gte: qty },
      },
      {
        $inc: {
          availableDefectiveQuantity: -qty,
          quantitySold: qty,
        },
      },
      { returnDocument: "after" }
    );

    if (!defective) {
      throw new Error(
        "Cannot sell defective stock: Insufficient available defective quantity or batch not found."
      );
    }

    if (defective.availableDefectiveQuantity === 0 && defective.quantityRepairing === 0) {
      defective.status = "Sold";
      await defective.save();
    }

    const product = await Product.findById(defective.product);
    let categoryId = product?.category;
    if (!categoryId) {
      const anyCategory = await Category.findOne();
      categoryId = anyCategory?._id;
    }

    const prodId = product?._id || defective.product;

    // Create existing Invoice with stockAlreadyDeducted = true
    const invoice = await Invoice.create({
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone?.trim() || "",
      customerEmail: input.customerEmail?.trim() || "",
      customerAddress: input.customerAddress?.trim() || "",
      customerCity: input.customerCity?.trim() || "",
      customerNote: input.customerNote?.trim() || "",
      products: [
        {
          product: prodId,
          category: categoryId,
          quantity: qty,
          salePrice: price,
          description: `Sold As-Is (Defective Inventory): ${defective.defectReason}${
            input.notes ? ` - ${input.notes.trim()}` : ""
          }${!product ? " (Archived Product)" : ""}`,
        },
      ],
      totalAmount: price,
      stockAlreadyDeducted: true, // Prevents deducting normal sellable stock
      soldBy: userId,
      type: "Sell",
    });

    // Populate the created invoice details for UI display
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("products.product", "name price images stock barcode")
      .populate("products.category", "name")
      .populate("soldBy", "name email role");

    // StockLog entry
    await StockLog.create({
      product: prodId,
      change: 0, // Sellable stock unchanged
      description: `Sold As-Is (Defective): ${qty} units - Invoice #${invoice._id.toString().slice(-8).toUpperCase()}`,
      previousStock: product?.stock || 0,
      resultingStock: product?.stock || 0,
      quantity: qty,
      movementType: "defective_sale",
      fromState: "defective",
      toState: "sold",
      defectiveId: defective._id,
      invoiceId: invoice._id,
      performedBy: userId,
      notes: input.notes?.trim() || "",
    });

    return {
      success: true,
      defective,
      invoice: populatedInvoice,
    };
  }

  /**
   * 7. Scrap defective stock.
   * Concurrency-safe:
   * - Decreases `DefectiveInventory.availableDefectiveQuantity`.
   * - Leaves active stock entirely.
   * - Records scrap recovery value and loss details.
   */
  static async scrapDefective(input: ScrapDefectiveInput, userId?: string) {
    await connectDB();
    ensureModels();

    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      throw new Error("Quantity to scrap must be a positive whole number.");
    }

    if (!input.reason || !input.reason.trim()) {
      throw new Error("Scrap reason is required.");
    }

    const recoveryValue = Number(input.scrapRecoveryValue || 0);
    if (!Number.isFinite(recoveryValue) || recoveryValue < 0) {
      throw new Error("Recovery value cannot be negative.");
    }

    // Atomic conditional decrement
    const defective = await DefectiveInventory.findOneAndUpdate(
      {
        _id: input.defectiveId,
        availableDefectiveQuantity: { $gte: qty },
      },
      {
        $inc: {
          availableDefectiveQuantity: -qty,
          quantityScrapped: qty,
        },
      },
      { returnDocument: "after" }
    );

    if (!defective) {
      throw new Error(
        "Cannot scrap defective stock: Insufficient available defective quantity or batch not found."
      );
    }

    if (defective.availableDefectiveQuantity === 0 && defective.quantityRepairing === 0) {
      defective.status = "Scrapped";
      await defective.save();
    }

    const product = await Product.findById(defective.product);

    // StockLog entry
    await StockLog.create({
      product: defective.product,
      change: 0,
      description: `Scrapped: ${qty} units (${input.reason.trim()}) - Recovery: Rs. ${recoveryValue.toLocaleString()}`,
      previousStock: product?.stock || 0,
      resultingStock: product?.stock || 0,
      quantity: qty,
      movementType: "scrapped",
      fromState: "defective",
      toState: "scrapped",
      defectiveId: defective._id,
      performedBy: userId || null,
      notes: input.notes?.trim() || "",
    });

    return {
      success: true,
      defective,
    };
  }

  /**
   * 8. Main Inventory Stock Overview with mixed stock states.
   * Returns:
   * - Good / Sellable (`Product.stock`)
   * - Pending Inspection (sum from `InventoryReceipt.items.qtyPending`)
   * - Defective (sum from `DefectiveInventory.availableDefectiveQuantity`)
   * - In Repair (sum from `DefectiveInventory.quantityRepairing`)
   * - Total Physical Active ($= \text{Sellable} + \text{Pending} + \text{Defective} + \text{Repairing}$)
   * Supports filtering, search, category, and pagination.
   */
  static async getInventoryOverview(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    stockFilter?: string; // "All" | "InStock" | "Pending" | "Defective" | "Repairing" | "OutOfStock"
  }) {
    await connectDB();
    ensureModels();

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 10)));
    const skip = (page - 1) * limit;

    const matchStage: any = {};

    if (params.search && params.search.trim()) {
      const escaped = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      matchStage.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { barcode: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    if (params.category && params.category !== "All" && params.category !== "undefined") {
      if (mongoose.Types.ObjectId.isValid(params.category)) {
        matchStage.category = new mongoose.Types.ObjectId(params.category);
      } else {
        const cat = await Category.findOne({
          name: { $regex: new RegExp(`^${params.category}$`, "i") },
        });
        if (cat) {
          matchStage.category = cat._id;
        } else {
          return {
            products: [],
            totalProducts: 0,
            totalPages: 0,
            currentPage: page,
            totalSellable: 0,
            totalPending: 0,
            totalDefective: 0,
            totalRepairing: 0,
            totalPhysical: 0,
          };
        }
      }
    }

    // Build aggregation pipeline for accurate, reactive stock states
    const pipeline: any[] = [
      { $match: matchStage },

      // 1. Lookup Pending Inspection quantities from InventoryReceipt items
      {
        $lookup: {
          from: "inventoryreceipts",
          let: { prodId: "$_id" },
          pipeline: [
            { $unwind: "$items" },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$items.product", "$$prodId"] },
                    { $gt: ["$items.qtyPending", 0] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalPending: { $sum: "$items.qtyPending" },
              },
            },
          ],
          as: "pendingAgg",
        },
      },

      // 2. Lookup Defective & Repairing quantities from DefectiveInventory
      {
        $lookup: {
          from: "defectiveinventories",
          let: { prodId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$product", "$$prodId"],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalDefective: { $sum: "$availableDefectiveQuantity" },
                totalRepairing: { $sum: "$quantityRepairing" },
              },
            },
          ],
          as: "defectiveAgg",
        },
      },

      // 3. Lookup Category Details
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },

      // 4. Project normalized stock states
      {
        $project: {
          name: 1,
          images: 1,
          description: 1,
          stock: { $ifNull: ["$stock", 0] }, // Sellable
          price: { $ifNull: ["$price", 0] },
          barcode: 1,
          createdAt: 1,
          category: { $arrayElemAt: ["$categoryDoc", 0] },
          pendingStock: {
            $ifNull: [{ $arrayElemAt: ["$pendingAgg.totalPending", 0] }, 0],
          },
          defectiveStock: {
            $ifNull: [{ $arrayElemAt: ["$defectiveAgg.totalDefective", 0] }, 0],
          },
          repairingStock: {
            $ifNull: [{ $arrayElemAt: ["$defectiveAgg.totalRepairing", 0] }, 0],
          },
        },
      },

      // 5. Add Total Physical Active Stock
      {
        $addFields: {
          totalPhysicalActiveStock: {
            $add: ["$stock", "$pendingStock", "$defectiveStock", "$repairingStock"],
          },
        },
      },
    ];

    // Filter stage by specific stock state if requested
    const filterVal = params.stockFilter || "All";
    if (filterVal === "InStock") {
      pipeline.push({ $match: { stock: { $gt: 0 } } });
    } else if (filterVal === "Pending") {
      pipeline.push({ $match: { pendingStock: { $gt: 0 } } });
    } else if (filterVal === "Defective") {
      pipeline.push({ $match: { defectiveStock: { $gt: 0 } } });
    } else if (filterVal === "Repairing") {
      pipeline.push({ $match: { repairingStock: { $gt: 0 } } });
    } else if (filterVal === "OutOfStock") {
      pipeline.push({ $match: { stock: 0 } });
    }

    // Facet for pagination + overall totals
    pipeline.push({
      $facet: {
        paginatedResults: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        totalCount: [{ $count: "count" }],
        overallTotals: [
          {
            $group: {
              _id: null,
              totalSellable: { $sum: "$stock" },
              totalPending: { $sum: "$pendingStock" },
              totalDefective: { $sum: "$defectiveStock" },
              totalRepairing: { $sum: "$repairingStock" },
              totalPhysical: { $sum: "$totalPhysicalActiveStock" },
            },
          },
        ],
      },
    });

    const result = await Product.aggregate(pipeline);
    const facet = result[0] || {};
    const products = facet.paginatedResults || [];
    const totalProducts = facet.totalCount?.[0]?.count || 0;
    const totals = facet.overallTotals?.[0] || {
      totalSellable: 0,
      totalPending: 0,
      totalDefective: 0,
      totalRepairing: 0,
      totalPhysical: 0,
    };

    const totalAllProducts = await Product.countDocuments();

    return {
      products,
      totalProducts,
      totalAllProducts,
      totalPages: Math.ceil(totalProducts / limit) || 1,
      currentPage: page,
      totalSellable: totals.totalSellable,
      totalPending: totals.totalPending,
      totalDefective: totals.totalDefective,
      totalRepairing: totals.totalRepairing,
      totalPhysical: totals.totalPhysical,
    };
  }

  /**
   * 9. Get detailed stock breakdown for a single product.
   */
  static async getProductStockBreakdown(productId: string | mongoose.Types.ObjectId) {
    await connectDB();
    ensureModels();

    const pId = new mongoose.Types.ObjectId(productId);
    const product = await Product.findById(pId).populate("category");
    if (!product) return null;

    // Pending
    const pendingAgg = await InventoryReceipt.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.product": pId,
          "items.qtyPending": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: "$items.qtyPending" },
        },
      },
    ]);
    const pendingStock = pendingAgg[0]?.totalPending || 0;

    // Defective & Repairing
    const defAgg = await DefectiveInventory.aggregate([
      { $match: { product: pId } },
      {
        $group: {
          _id: null,
          totalDefective: { $sum: "$availableDefectiveQuantity" },
          totalRepairing: { $sum: "$quantityRepairing" },
          totalSold: { $sum: "$quantitySold" },
          totalScrapped: { $sum: "$quantityScrapped" },
        },
      },
    ]);
    const defectiveStock = defAgg[0]?.totalDefective || 0;
    const repairingStock = defAgg[0]?.totalRepairing || 0;
    const soldDefectiveStock = defAgg[0]?.totalSold || 0;
    const scrappedStock = defAgg[0]?.totalScrapped || 0;

    const sellableStock = product.stock || 0;
    const totalPhysicalActiveStock =
      sellableStock + pendingStock + defectiveStock + repairingStock;

    return {
      productId: product._id,
      name: product.name,
      images: product.images,
      price: product.price,
      barcode: product.barcode,
      category: product.category,
      sellableStock,
      pendingStock,
      defectiveStock,
      repairingStock,
      totalPhysicalActiveStock,
      soldDefectiveStock,
      scrappedStock,
    };
  }

  /**
   * Bulk delete inventory receipts.
   */
  static async bulkDeleteReceipts(ids: string[]) {
    await connectDB();
    ensureModels();
    if (!ids || ids.length === 0) return { success: true, deletedCount: 0 };
    const result = await InventoryReceipt.deleteMany({ _id: { $in: ids } });
    return { success: true, deletedCount: result.deletedCount };
  }

  /**
   * Delete a single defective inventory entry with validation and audit log.
   */
  static async deleteDefective(defectiveId: string, userId?: string) {
    await connectDB();
    ensureModels();

    const defective = await DefectiveInventory.findById(defectiveId);
    if (!defective) {
      throw new Error("Defective inventory record not found.");
    }

    // Check if there are active repair jobs in progress
    const activeJobsCount = await RepairJob.countDocuments({
      defectiveInventory: defective._id,
      status: "In Progress",
    });

    if (activeJobsCount > 0) {
      throw new Error(
        `Cannot delete: This defective batch has ${activeJobsCount} repair job(s) currently in progress.`
      );
    }

    const product = await Product.findById(defective.product);

    // Create StockLog audit entry
    await StockLog.create({
      product: defective.product,
      change: 0,
      description: `Defective Record Deleted (${defective.defectReason}): Qty ${defective.availableDefectiveQuantity} removed from defective registry`,
      previousStock: product?.stock || 0,
      resultingStock: product?.stock || 0,
      quantity: defective.availableDefectiveQuantity,
      movementType: "adjustment",
      fromState: "defective",
      toState: "deleted",
      defectiveId: defective._id,
      performedBy: userId || null,
    });

    await DefectiveInventory.findByIdAndDelete(defectiveId);

    return {
      success: true,
      deletedId: defectiveId,
    };
  }

  /**
   * Bulk delete defective inventory entries.
   */
  static async bulkDeleteDefective(ids: string[]) {
    await connectDB();
    ensureModels();
    if (!ids || ids.length === 0) return { success: true, deletedCount: 0 };
    const result = await DefectiveInventory.deleteMany({ _id: { $in: ids } });
    return { success: true, deletedCount: result.deletedCount };
  }

  /**
   * Return defective stock back to Stock Receiving (Receipt pending inspection).
   * - Decreases availableDefectiveQuantity on DefectiveInventory.
   * - Increments qtyPending and decrements qtyDefective on the linked InventoryReceipt item.
   * - Recalculates and updates receipt inspection status.
   * - Logs movement in StockLog.
   * - Invariant: Sellable stock (Product.stock) remains unchanged.
   */
  static async returnDefectiveToReceiving(
    input: ReturnDefectiveToReceivingInput,
    userId?: string
  ) {
    await connectDB();
    ensureModels();

    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      throw new Error("Quantity to return must be a positive whole number.");
    }

    // Atomic conditional decrement of available defective quantity
    const defective = await DefectiveInventory.findOneAndUpdate(
      {
        _id: input.defectiveId,
        availableDefectiveQuantity: { $gte: qty },
      },
      {
        $inc: {
          availableDefectiveQuantity: -qty,
          originalQuantity: -qty,
        },
      },
      { returnDocument: "after" }
    );

    if (!defective) {
      throw new Error(
        "Cannot return to receiving: Available defective quantity is insufficient or entry not found."
      );
    }

    if (
      defective.availableDefectiveQuantity === 0 &&
      defective.quantityRepairing === 0 &&
      defective.quantitySold === 0 &&
      defective.quantityScrapped === 0
    ) {
      defective.status = "Returned to Receiving";
    }
    await defective.save();

    let receiptNumber = "N/A";
    let receiptDoc: any = null;

    if (defective.receipt) {
      receiptDoc = await InventoryReceipt.findById(defective.receipt);
      if (receiptDoc) {
        receiptNumber = receiptDoc.receiptNumber;
        let itemIndex = -1;
        if (defective.receiptItemId) {
          itemIndex = receiptDoc.items.findIndex(
            (it: any) => String(it._id) === String(defective.receiptItemId)
          );
        }
        if (itemIndex === -1) {
          itemIndex = receiptDoc.items.findIndex(
            (it: any) => String(it.product) === String(defective.product)
          );
        }

        if (itemIndex !== -1) {
          const item = receiptDoc.items[itemIndex];
          item.qtyDefective = Math.max(0, (item.qtyDefective || 0) - qty);
          item.qtyPending = (item.qtyPending || 0) + qty;
          await receiptDoc.save();
          await this.syncReceiptStatus(receiptDoc._id);
        }
      }
    }

    const product = await Product.findById(defective.product);

    // StockLog entry
    await StockLog.create({
      product: defective.product,
      change: 0,
      description: `Returned to Stock Receiving: ${qty} units reverted to Receipt ${receiptNumber} (Mistaken Defect)`,
      previousStock: product?.stock || 0,
      resultingStock: product?.stock || 0,
      quantity: qty,
      movementType: "defective_to_receiving",
      fromState: "defective",
      toState: "pending",
      defectiveId: defective._id,
      receiptId: defective.receipt || null,
      performedBy: userId || null,
      notes: input.notes?.trim() || "",
    });

    return {
      success: true,
      defective,
      receiptNumber,
      returnedQty: qty,
    };
  }

  /**
   * Bulk return multiple defective items back to Stock Receiving.
   */
  static async bulkReturnDefectiveToReceiving(
    input: BulkReturnDefectiveToReceivingInput,
    userId?: string
  ) {
    await connectDB();
    ensureModels();

    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("No defective items provided for return to receiving.");
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (const item of input.items) {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) continue;

      try {
        const res = await this.returnDefectiveToReceiving(
          {
            defectiveId: item.defectiveId,
            quantity: qty,
            notes: item.notes || input.notes,
          },
          userId
        );
        results.push(res);
      } catch (err: any) {
        errors.push(`Item ${item.defectiveId}: ${err.message}`);
      }
    }

    return {
      success: true,
      returnedCount: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Move defective stock directly to Good (Sellable) Stock.
   * - Decreases availableDefectiveQuantity on DefectiveInventory.
   * - Increments sellable stock on the Product (Product.stock).
   * - Updates receipt item if linked (qtyDefective -= qty, qtyGood += qty).
   * - Logs movement in StockLog.
   */
  static async moveDefectiveToGood(
    input: MoveDefectiveToGoodInput,
    userId?: string
  ) {
    await connectDB();
    ensureModels();

    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      throw new Error("Quantity to move must be a positive whole number.");
    }

    // Atomic conditional decrement of available defective quantity
    const defective = await DefectiveInventory.findOneAndUpdate(
      {
        _id: input.defectiveId,
        availableDefectiveQuantity: { $gte: qty },
      },
      {
        $inc: {
          availableDefectiveQuantity: -qty,
          originalQuantity: -qty,
        },
      },
      { returnDocument: "after" }
    );

    if (!defective) {
      throw new Error(
        "Cannot move to good stock: Available defective quantity is insufficient or entry not found."
      );
    }

    if (
      defective.availableDefectiveQuantity === 0 &&
      defective.quantityRepairing === 0 &&
      defective.quantitySold === 0 &&
      defective.quantityScrapped === 0
    ) {
      defective.status = "Moved to Good Stock";
    }
    await defective.save();

    // Increment sellable stock on the Product
    const prevProduct = await Product.findOneAndUpdate(
      { _id: defective.product },
      { $inc: { stock: qty } },
      { returnDocument: "before" }
    );

    if (!prevProduct) {
      throw new Error("Product record not found.");
    }

    const previousStock = prevProduct.stock;
    const resultingStock = previousStock + qty;

    // If linked to a receipt, update the receipt item
    let receiptNumber = "N/A";
    if (defective.receipt) {
      const receiptDoc = await InventoryReceipt.findById(defective.receipt);
      if (receiptDoc) {
        receiptNumber = receiptDoc.receiptNumber;
        let itemIndex = -1;
        if (defective.receiptItemId) {
          itemIndex = receiptDoc.items.findIndex(
            (it: any) => String(it._id) === String(defective.receiptItemId)
          );
        }
        if (itemIndex === -1) {
          itemIndex = receiptDoc.items.findIndex(
            (it: any) => String(it.product) === String(defective.product)
          );
        }

        if (itemIndex !== -1) {
          const item = receiptDoc.items[itemIndex];
          item.qtyDefective = Math.max(0, (item.qtyDefective || 0) - qty);
          item.qtyGood = (item.qtyGood || 0) + qty;
          await receiptDoc.save();
          await this.syncReceiptStatus(receiptDoc._id);
        }
      }
    }

    // StockLog entry
    await StockLog.create({
      product: defective.product,
      change: qty, // Positive increase to sellable stock
      description: `Moved directly from Defective to Good Stock: +${qty} units (Defect correction)${
        receiptNumber !== "N/A" ? ` from receipt ${receiptNumber}` : ""
      }`,
      previousStock,
      resultingStock,
      quantity: qty,
      movementType: "defective_to_good",
      fromState: "defective",
      toState: "sellable",
      defectiveId: defective._id,
      receiptId: defective.receipt || null,
      performedBy: userId || null,
      notes: input.notes?.trim() || "",
    });

    return {
      success: true,
      defective,
      newSellableStock: resultingStock,
      movedQty: qty,
      receiptNumber,
    };
  }

  /**
   * Bulk move multiple defective items directly to Good (Sellable) Stock.
   */
  static async bulkMoveDefectiveToGood(
    input: BulkMoveDefectiveToGoodInput,
    userId?: string
  ) {
    await connectDB();
    ensureModels();

    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("No defective items provided to move to good stock.");
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (const item of input.items) {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) continue;

      try {
        const res = await this.moveDefectiveToGood(
          {
            defectiveId: item.defectiveId,
            quantity: qty,
            notes: item.notes || input.notes,
          },
          userId
        );
        results.push(res);
      } catch (err: any) {
        errors.push(`Item ${item.defectiveId}: ${err.message}`);
      }
    }

    return {
      success: true,
      movedCount: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Bulk sell multiple defective items together.
   * Generates a single unified Invoice for all sold items.
   */
  static async bulkSellDefective(input: BulkSellDefectiveInput, userId: string) {
    await connectDB();
    ensureModels();

    if (!input.items || input.items.length === 0) {
      throw new Error("No defective items provided for bulk sale.");
    }

    if (!input.customerName || !input.customerName.trim()) {
      throw new Error("Customer name is required.");
    }

    const anyCategory = await Category.findOne();
    const invoiceProducts: any[] = [];
    let grandTotal = 0;
    const processedDefectives: any[] = [];

    for (const it of input.items) {
      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
        throw new Error("Each item quantity must be a positive whole number.");
      }

      const price = Number(it.salePrice);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Each item sale price must be zero or greater.");
      }

      const defective = await DefectiveInventory.findOneAndUpdate(
        {
          _id: it.defectiveId,
          availableDefectiveQuantity: { $gte: qty },
        },
        {
          $inc: {
            availableDefectiveQuantity: -qty,
            quantitySold: qty,
          },
        },
        { returnDocument: "after" }
      );

      if (!defective) {
        throw new Error(
          `Insufficient available quantity or item not found for defective item ID: ${it.defectiveId}`
        );
      }

      if (defective.availableDefectiveQuantity === 0 && defective.quantityRepairing === 0) {
        defective.status = "Sold";
        await defective.save();
      }

      const product = await Product.findById(defective.product);
      const categoryId = product?.category || anyCategory?._id;
      const prodId = product?._id || defective.product;

      invoiceProducts.push({
        product: prodId,
        category: categoryId,
        quantity: qty,
        salePrice: price,
        description: `Sold As-Is (Defective Inventory): ${defective.defectReason}${
          it.notes ? ` - ${it.notes.trim()}` : ""
        }${!product ? " (Archived Product)" : ""}`,
      });

      grandTotal += price;
      processedDefectives.push({ defective, product, qty, price, notes: it.notes });
    }

    // Create single Invoice with all products
    const invoice = await Invoice.create({
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone?.trim() || "",
      customerEmail: input.customerEmail?.trim() || "",
      customerAddress: input.customerAddress?.trim() || "",
      customerCity: input.customerCity?.trim() || "",
      customerNote: input.customerNote?.trim() || "",
      products: invoiceProducts,
      totalAmount: grandTotal,
      stockAlreadyDeducted: true,
      soldBy: userId,
      type: "Sell",
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("products.product", "name price images stock barcode")
      .populate("products.category", "name")
      .populate("soldBy", "name email role");

    // StockLog for each processed item
    for (const item of processedDefectives) {
      await StockLog.create({
        product: item.product?._id || item.defective.product,
        change: 0,
        description: `Bulk Sold As-Is (Defective): ${item.qty} units - Invoice #${invoice._id.toString().slice(-8).toUpperCase()}`,
        previousStock: item.product?.stock || 0,
        resultingStock: item.product?.stock || 0,
        quantity: item.qty,
        movementType: "defective_sale",
        fromState: "defective",
        toState: "sold",
        defectiveId: item.defective._id,
        invoiceId: invoice._id,
        performedBy: userId,
        notes: item.notes?.trim() || input.notes?.trim() || "",
      });
    }

    return {
      success: true,
      count: processedDefectives.length,
      invoice: populatedInvoice,
    };
  }

  /**
   * Bulk scrap multiple defective items.
   */
  static async bulkScrapDefective(input: BulkScrapDefectiveInput, userId?: string) {
    await connectDB();
    ensureModels();

    if (!input.items || input.items.length === 0) {
      throw new Error("No defective items provided for bulk scrap.");
    }

    const scrappedList: any[] = [];

    for (const it of input.items) {
      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) continue;

      const recovery = Number(it.scrapRecoveryValue || 0);

      const defective = await DefectiveInventory.findOneAndUpdate(
        {
          _id: it.defectiveId,
          availableDefectiveQuantity: { $gte: qty },
        },
        {
          $inc: {
            availableDefectiveQuantity: -qty,
            quantityScrapped: qty,
          },
        },
        { returnDocument: "after" }
      );

      if (!defective) continue;

      if (defective.availableDefectiveQuantity === 0 && defective.quantityRepairing === 0) {
        defective.status = "Scrapped";
        await defective.save();
      }

      const product = await Product.findById(defective.product);

      await StockLog.create({
        product: defective.product,
        change: 0,
        description: `Bulk Scrapped: ${qty} units (${it.reason || "Beyond Repair"}) - Recovery: Rs. ${recovery.toLocaleString()}`,
        previousStock: product?.stock || 0,
        resultingStock: product?.stock || 0,
        quantity: qty,
        movementType: "scrapped",
        fromState: "defective",
        toState: "scrapped",
        defectiveId: defective._id,
        performedBy: userId || null,
        notes: it.notes?.trim() || "",
      });

      scrappedList.push(defective);
    }

    return {
      success: true,
      scrappedCount: scrappedList.length,
      scrappedList,
    };
  }

  /**
   * Bulk send multiple defective items to repair.
   */
  static async bulkRepairDefective(input: BulkRepairDefectiveInput, userId?: string) {
    await connectDB();
    ensureModels();

    if (!input.items || input.items.length === 0) {
      throw new Error("No defective items provided for bulk repair.");
    }

    const repairList: any[] = [];

    for (const it of input.items) {
      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) continue;

      const estCost = Number(it.estimatedCost || 0);

      const defective = await DefectiveInventory.findOneAndUpdate(
        {
          _id: it.defectiveId,
          availableDefectiveQuantity: { $gte: qty },
        },
        {
          $inc: {
            availableDefectiveQuantity: -qty,
            quantityRepairing: qty,
          },
          $set: {
            status: "In Repair",
          },
        },
        { returnDocument: "after" }
      );

      if (!defective) continue;

      if (defective.availableDefectiveQuantity > 0) {
        defective.status = "Partially In Repair";
        await defective.save();
      }

      const repairJob = await RepairJob.create({
        defectiveInventory: defective._id,
        product: defective.product,
        quantity: qty,
        technicianOrVendor: it.technicianOrVendor?.trim() || "",
        estimatedCost: estCost,
        startDate: new Date(),
        status: "In Progress",
        notes: it.notes?.trim() || "",
      });

      const product = await Product.findById(defective.product);

      await StockLog.create({
        product: defective.product,
        change: 0,
        description: `Bulk Sent to Repair: ${qty} units${
          it.technicianOrVendor ? ` with ${it.technicianOrVendor.trim()}` : ""
        }`,
        previousStock: product?.stock || 0,
        resultingStock: product?.stock || 0,
        quantity: qty,
        movementType: "repair_start",
        fromState: "defective",
        toState: "repairing",
        defectiveId: defective._id,
        repairJobId: repairJob._id,
        performedBy: userId || null,
        notes: it.notes?.trim() || "",
      });

      repairList.push({ defective, repairJob });
    }

    return {
      success: true,
      repairedCount: repairList.length,
      repairList,
    };
  }

  /**
   * Dispatches defective stock to a Repair Vendor (e.g., Viraj, Poonam).
   * - Atomically reserves available defective stock & increments quantityRepairing.
   * - Creates RepairJob records with repairInvoiceNo tracking.
   * - Generates an Invoice with type="Repair", customerName=vendorName, stockAlreadyDeducted=true.
   * - Creates StockLog entries for complete audit trail.
   * - Returns repair jobs, invoice, and billData for one-click BillModal printing/download.
   */
  static async dispatchToRepairVendor(input: DispatchRepairVendorInput, userId: string) {
    await connectDB();
    ensureModels();

    if (!input.vendorName || !input.vendorName.trim()) {
      throw new Error("Vendor / Technician name is required.");
    }
    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("At least one defective item must be dispatched.");
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const repairInvoiceNo = `REP-${dateStr}-${randomSuffix}`;

    const createdJobs: any[] = [];
    const invoiceProducts: any[] = [];
    let totalEstimatedCost = 0;

    for (const it of input.items) {
      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
        throw new Error("Quantity to repair must be a positive whole number.");
      }

      const estCost = Math.max(0, Number(it.estimatedCost) || 0);

      // Atomically decrement available defective stock
      const defective = await DefectiveInventory.findOneAndUpdate(
        {
          _id: it.defectiveId,
          availableDefectiveQuantity: { $gte: qty },
        },
        {
          $inc: {
            availableDefectiveQuantity: -qty,
            quantityRepairing: qty,
          },
        },
        { returnDocument: "after" }
      );

      if (!defective) {
        throw new Error("Insufficient available defective quantity or batch not found.");
      }

      if (defective.availableDefectiveQuantity === 0) {
        defective.status = "In Repair";
      } else {
        defective.status = "Partially In Repair";
      }
      await defective.save();

      const product = await Product.findById(defective.product);

      const repairJob = await RepairJob.create({
        defectiveInventory: defective._id,
        product: defective.product,
        quantity: qty,
        technicianOrVendor: input.vendorName.trim(),
        repairInvoiceNo,
        vendorPhone: input.vendorPhone?.trim() || "",
        vendorAddress: input.vendorAddress?.trim() || "",
        estimatedCost: estCost,
        actualCost: 0,
        startDate: now,
        expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : null,
        notes: it.notes?.trim() || input.notes?.trim() || "",
        status: "In Progress",
      });

      await StockLog.create({
        product: defective.product,
        change: 0,
        description: `Dispatched to Repair Vendor: ${qty} units sent to ${input.vendorName.trim()} (Challan: ${repairInvoiceNo})`,
        previousStock: product?.stock || 0,
        resultingStock: product?.stock || 0,
        quantity: qty,
        movementType: "repair_start",
        fromState: "defective",
        toState: "repairing",
        defectiveId: defective._id,
        repairJobId: repairJob._id,
        performedBy: userId || null,
        notes: input.notes?.trim() || "",
      });

      let categoryId = product?.category;
      if (!categoryId) {
        const anyCat = await Category.findOne();
        categoryId = anyCat?._id;
      }

      invoiceProducts.push({
        product: defective.product,
        category: categoryId,
        quantity: qty,
        salePrice: estCost,
        description: `Defect: ${defective.defectReason}${it.notes ? ` - ${it.notes}` : ""}`,
      });

      totalEstimatedCost += estCost * qty;
      createdJobs.push({
        ...repairJob.toObject(),
        productName: product?.name || "Product",
        productImage: product?.images?.[0]?.url || "",
        defectReason: defective.defectReason,
      });
    }

    // Create Invoice with type="Repair"
    const invoice = await Invoice.create({
      customerName: input.vendorName.trim(),
      customerPhone: input.vendorPhone?.trim() || "",
      customerAddress: input.vendorAddress?.trim() || "",
      type: "Repair",
      products: invoiceProducts,
      totalAmount: totalEstimatedCost,
      stockAlreadyDeducted: true,
      soldBy: userId,
      customerNote: `Repair Challan: ${repairInvoiceNo}${input.notes ? `. Notes: ${input.notes}` : ""}`,
    });

    const billData = {
      invoiceNo: repairInvoiceNo,
      date: now.toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      customerName: input.vendorName.trim(),
      customerPhone: input.vendorPhone?.trim() || "",
      customerAddress: input.vendorAddress?.trim() || "",
      type: "Repair",
      totalAmount: totalEstimatedCost,
      products: createdJobs.map((j) => ({
        productName: j.productName,
        quantity: j.quantity,
        salePrice: j.estimatedCost,
        description: `Defect: ${j.defectReason}${j.notes ? ` | Note: ${j.notes}` : ""}`,
        productImage: j.productImage,
      })),
      notes: input.notes || "",
    };

    return {
      success: true,
      repairInvoiceNo,
      invoice,
      repairJobs: createdJobs,
      billData,
    };
  }

  /**
   * Fetches repair jobs with optional filters (vendor, status, search, pagination).
   */
  static async getRepairJobs(params: {
    vendor?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    await connectDB();
    ensureModels();

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 15)));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (params.vendor && params.vendor !== "All") {
      query.technicianOrVendor = { $regex: new RegExp(`^${params.vendor.trim()}$`, "i") };
    }
    if (params.status && params.status !== "All") {
      query.status = params.status;
    }
    if (params.search && params.search.trim()) {
      const escaped = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchingProductIds = await Product.find({
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { barcode: { $regex: escaped, $options: "i" } },
        ],
      }).select("_id");

      query.$or = [
        { repairInvoiceNo: { $regex: escaped, $options: "i" } },
        { technicianOrVendor: { $regex: escaped, $options: "i" } },
        { notes: { $regex: escaped, $options: "i" } },
        { product: { $in: matchingProductIds.map((p) => p._id) } },
      ];
    }

    const totalJobs = await RepairJob.countDocuments(query);
    const totalPages = Math.ceil(totalJobs / limit) || 1;

    const repairJobs = await RepairJob.find(query)
      .populate("product", "name price images stock barcode")
      .populate("defectiveInventory", "defectReason status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Collect list of distinct vendors
    const vendors = await RepairJob.distinct("technicianOrVendor", {
      technicianOrVendor: { $ne: "" },
    });

    return {
      repairJobs,
      totalJobs,
      totalPages,
      currentPage: page,
      vendors,
    };
  }
}

export default InventoryService;
