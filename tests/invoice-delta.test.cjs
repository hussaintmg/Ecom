const test = require("node:test");
const assert = require("node:assert/strict");

// Re-creates the exact stock delta balancing engine from app/api/invoices/[id]/route.ts
function simulateInvoiceStockUpdate({ currentInvoice, updatedProducts, mockProductsDb }) {
  const oldItems = currentInvoice.products && currentInvoice.products.length > 0
    ? currentInvoice.products
    : [{ product: currentInvoice.product, quantity: currentInvoice.quantity, salePrice: currentInvoice.salePrice }];

  const oldQtyMap = {};
  for (const item of oldItems) {
    const pid = String(item.product?._id || item.product);
    oldQtyMap[pid] = (oldQtyMap[pid] || 0) + Number(item.quantity || 0);
  }

  const newQtyMap = {};
  for (const item of updatedProducts) {
    const pid = String(item.productId || item.product?._id || item.product);
    newQtyMap[pid] = (newQtyMap[pid] || 0) + Number(item.quantity || 0);
  }

  // Pre-check stock availability
  for (const [pid, newQty] of Object.entries(newQtyMap)) {
    const oldQty = oldQtyMap[pid] || 0;
    const delta = newQty - oldQty;
    if (delta > 0) {
      const product = mockProductsDb[pid];
      if (!product) {
        return { success: false, error: `Product not found: ${pid}` };
      }
      if (product.stock < delta) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}". Requested increase: ${delta}, available: ${product.stock}`,
        };
      }
    }
  }

  // Apply changes
  const stockLogs = [];
  const allProductIds = new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)]);
  for (const pid of allProductIds) {
    const oldQty = oldQtyMap[pid] || 0;
    const newQty = newQtyMap[pid] || 0;
    const delta = newQty - oldQty;
    if (delta !== 0) {
      const product = mockProductsDb[pid];
      if (product) {
        product.stock -= delta;
        stockLogs.push({
          productId: pid,
          change: -delta,
          resultingStock: product.stock,
        });
      }
    }
  }

  let calculatedTotal = 0;
  const newProducts = updatedProducts.map((p) => {
    const price = Number(p.salePrice || 0);
    calculatedTotal += price;
    return {
      product: p.productId || p.product,
      quantity: Number(p.quantity || 1),
      salePrice: price,
    };
  });

  return {
    success: true,
    totalAmount: calculatedTotal,
    stockLogs,
    mockProductsDb,
  };
}

test("Invoice update: increasing quantity deducts warehouse stock", () => {
  const mockProductsDb = {
    p1: { name: "Water Filter", stock: 10 },
  };
  const currentInvoice = {
    _id: "inv1",
    products: [{ product: "p1", quantity: 2, salePrice: 2000 }],
  };
  const updatedProducts = [
    { productId: "p1", quantity: 5, salePrice: 5000 },
  ];

  const res = simulateInvoiceStockUpdate({ currentInvoice, updatedProducts, mockProductsDb });
  assert.equal(res.success, true);
  // Stock was 10, increased sold qty by 3 -> new stock should be 7
  assert.equal(mockProductsDb.p1.stock, 7);
  assert.equal(res.stockLogs[0].change, -3);
  assert.equal(res.totalAmount, 5000);
});

test("Invoice update: decreasing quantity restores warehouse stock", () => {
  const mockProductsDb = {
    p1: { name: "Water Filter", stock: 10 },
  };
  const currentInvoice = {
    _id: "inv2",
    products: [{ product: "p1", quantity: 5, salePrice: 5000 }],
  };
  const updatedProducts = [
    { productId: "p1", quantity: 2, salePrice: 2000 },
  ];

  const res = simulateInvoiceStockUpdate({ currentInvoice, updatedProducts, mockProductsDb });
  assert.equal(res.success, true);
  // Stock was 10, decreased sold qty by 3 -> new stock should be 13
  assert.equal(mockProductsDb.p1.stock, 13);
  assert.equal(res.stockLogs[0].change, 3);
  assert.equal(res.totalAmount, 2000);
});

test("Invoice update: rejects when warehouse has insufficient stock for delta", () => {
  const mockProductsDb = {
    p1: { name: "Water Filter", stock: 2 },
  };
  const currentInvoice = {
    _id: "inv3",
    products: [{ product: "p1", quantity: 1, salePrice: 1000 }],
  };
  // Wants 5 (+4 requested, but only 2 available in warehouse)
  const updatedProducts = [
    { productId: "p1", quantity: 5, salePrice: 5000 },
  ];

  const res = simulateInvoiceStockUpdate({ currentInvoice, updatedProducts, mockProductsDb });
  assert.equal(res.success, false);
  assert.match(res.error, /Insufficient stock/);
  // Warehouse stock must remain untouched
  assert.equal(mockProductsDb.p1.stock, 2);
});
