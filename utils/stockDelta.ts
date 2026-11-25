import Product from "@/models/Product";
import StockLog from "@/models/StockLog";

export interface LineItemInput {
  productId?: any;
  product?: any;
  categoryId?: any;
  category?: any;
  quantity: number | string;
  salePrice: number | string;
  description?: string;
}

export interface NormalizedLineItem {
  product: any;
  category: any;
  quantity: number;
  salePrice: number;
  description: string;
}

/**
 * Validates incoming line items, resolves each product and its category from MongoDB,
 * optionally reconciles warehouse Product.stock deltas against previous items, and returns
 * normalized line items plus recalculated totalAmount.
 */
export async function reconcileLineItemsAndStock(params: {
  oldItems: any[];
  newItemsRaw: LineItemInput[];
  adjustWarehouseStock: boolean;
  userId: string;
  logContextLabel: string;
  invoiceId?: any;
}): Promise<
  | { ok: true; items: NormalizedLineItem[]; totalAmount: number }
  | { ok: false; status: number; error: string }
> {
  const { oldItems, newItemsRaw, adjustWarehouseStock, userId, logContextLabel, invoiceId } = params;

  if (!Array.isArray(newItemsRaw) || newItemsRaw.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "At least one product item is required.",
    };
  }

  const parsedItems: Array<{
    productId: string;
    categoryId?: any;
    quantity: number;
    salePrice: number;
    description: string;
  }> = [];

  for (const raw of newItemsRaw) {
    const pid = String(raw.productId || raw.product?._id || raw.product || "").trim();
    if (!pid) {
      return { ok: false, status: 400, error: "Each item must specify a product." };
    }

    const qty = Number(raw.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      return {
        ok: false,
        status: 400,
        error: "Quantity for each product must be a positive whole number.",
      };
    }

    const price = Number(raw.salePrice);
    if (!Number.isFinite(price) || price < 0) {
      return {
        ok: false,
        status: 400,
        error: "Price for each product must be zero or greater.",
      };
    }

    parsedItems.push({
      productId: pid,
      categoryId: raw.categoryId || raw.category?._id || raw.category,
      quantity: qty,
      salePrice: price,
      description: (raw.description || "").trim(),
    });
  }

  // Fetch all new products cleanly to validate existence & resolve category reliably
  const newProductIds = Array.from(new Set(parsedItems.map((i) => i.productId)));
  const productDocs = await Product.find({ _id: { $in: newProductIds } });
  const productMap = new Map<string, any>();
  for (const doc of productDocs) {
    productMap.set(doc._id.toString(), doc);
  }

  for (const item of parsedItems) {
    if (!productMap.has(item.productId)) {
      return {
        ok: false,
        status: 404,
        error: `Selected product not found (${item.productId}).`,
      };
    }
  }

  if (adjustWarehouseStock) {
    const oldQtyMap: Record<string, number> = {};
    for (const oldItem of oldItems || []) {
      const pid = String(oldItem.product?._id || oldItem.product || "");
      if (pid) {
        oldQtyMap[pid] = (oldQtyMap[pid] || 0) + Number(oldItem.quantity || 0);
      }
    }

    const newQtyMap: Record<string, number> = {};
    for (const item of parsedItems) {
      newQtyMap[item.productId] = (newQtyMap[item.productId] || 0) + item.quantity;
    }

    // 1. Pre-check stock availability for every product where net demand increased
    for (const [pid, newQty] of Object.entries(newQtyMap)) {
      const oldQty = oldQtyMap[pid] || 0;
      const delta = newQty - oldQty;
      if (delta > 0) {
        const doc = productMap.get(pid);
        if (!doc || doc.stock < delta) {
          return {
            ok: false,
            status: 400,
            error: `Insufficient stock for "${doc?.name || pid}". Need ${delta} more unit(s), available in warehouse: ${doc?.stock ?? 0}.`,
          };
        }
      }
    }

    // 2. Apply exact stock adjustments & create StockLog entries
    const allProductIds = new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)]);
    for (const pid of allProductIds) {
      const oldQty = oldQtyMap[pid] || 0;
      const newQty = newQtyMap[pid] || 0;
      const delta = newQty - oldQty;
      if (delta === 0) continue;

      let doc = productMap.get(pid);
      if (!doc) {
        doc = await Product.findById(pid);
      }
      if (!doc) continue;

      const previousStock = Number(doc.stock || 0);
      const resultingStock = Math.max(0, previousStock - delta);
      doc.stock = resultingStock;
      await doc.save();

      await StockLog.create({
        product: doc._id,
        change: -delta,
        previousStock,
        resultingStock,
        quantity: Math.abs(delta),
        movementType: "adjustment",
        invoiceId: invoiceId || null,
        description: `${logContextLabel}: quantity changed from ${oldQty} to ${newQty} (${
          delta > 0 ? `-${delta} deducted` : `+${Math.abs(delta)} restored`
        }).`,
        performedBy: userId,
      });
    }
  }

  let totalAmount = 0;
  const normalizedItems: NormalizedLineItem[] = parsedItems.map((item) => {
    const doc = productMap.get(item.productId);
    totalAmount += item.salePrice;
    return {
      product: doc._id,
      category: item.categoryId || doc.category,
      quantity: item.quantity,
      salePrice: item.salePrice,
      description: item.description,
    };
  });

  return { ok: true, items: normalizedItems, totalAmount };
}
