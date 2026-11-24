/* eslint-disable @typescript-eslint/no-require-imports */
require("./register-ts.cjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const mongoose = require("mongoose");

const database = `ecom_recv_multi_test_${process.pid}_${Date.now()}`;
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${database}?serverSelectionTimeoutMS=5000`;
process.env.JWT_SECRET = "local-multi-item-test-secret";

const connectDB = require("../utils/db.ts").default;
const Product = require("../models/Product.ts").default;
const Category = require("../models/Category.ts").default;
const User = require("../models/User.ts").default;
const InventoryReceipt = require("../models/InventoryReceipt.ts").default;
const DefectiveInventory = require("../models/DefectiveInventory.ts").default;
const { InventoryService } = require("../services/inventoryService.ts");

test("Multi-product receiving: markGood & markDefective target the exact sub-row without touching upper products", async () => {
  try {
  await connectDB();

  const category = await Category.create({ name: "Multi Item Test Category" });
  const adminUser = await User.create({
    name: "Admin Receiving Tester",
    username: `recv_tester_${Date.now()}`,
    email: `recv_${Date.now()}@test.local`,
    password: "pwd",
    role: "admin",
    status: "Approved",
  });

  // 1. Create 3 distinct products
  const prodTop = await Product.create({
    name: "Product 1 (Top / Upper Product)",
    description: "First product in receipt",
    category: category._id,
    stock: 10,
    price: 1000,
  });

  const prodMiddle = await Product.create({
    name: "Product 2 (Middle Product)",
    description: "Second product in receipt",
    category: category._id,
    stock: 20,
    price: 2000,
  });

  const prodBottom = await Product.create({
    name: "Product 3 (Bottom / Lower Product)",
    description: "Third product in receipt",
    category: category._id,
    stock: 30,
    price: 3000,
  });

  // 2. Receive a single shipment with all 3 products
  const receipt = await InventoryService.receiveStock(
    {
      referenceNumber: `TEST-REC-${Date.now()}`,
      vendor: "Multi-Item Supplier Ltd",
      origin: "Taiwan",
      items: [
        { productId: prodTop._id.toString(), quantity: 10, unitCost: 700 },
        { productId: prodMiddle._id.toString(), quantity: 15, unitCost: 1400 },
        { productId: prodBottom._id.toString(), quantity: 8, unitCost: 2100 },
      ],
    },
    adminUser._id.toString()
  );

  assert.equal(receipt.items.length, 3);
  const itemTop = receipt.items[0];
  const itemMiddle = receipt.items[1];
  const itemBottom = receipt.items[2];

  const getProdId = (p) => (p && p._id ? p._id : p).toString();
  assert.equal(getProdId(itemTop.product), prodTop._id.toString());
  assert.equal(getProdId(itemMiddle.product), prodMiddle._id.toString());
  assert.equal(getProdId(itemBottom.product), prodBottom._id.toString());

  // Invariant verification before any actions:
  assert.equal(itemTop.qtyPending, 10);
  assert.equal(itemMiddle.qtyPending, 15);
  assert.equal(itemBottom.qtyPending, 8);

  // 3. Mark 3 units as Good on Product 3 (BOTTOM PRODUCT)
  const markGoodResult = await InventoryService.markGood(
    {
      receiptId: receipt._id.toString(),
      itemId: itemBottom._id.toString(),
      quantity: 3,
      notes: "Testing bottom item good stock",
    },
    adminUser._id.toString()
  );

  assert.equal(markGoodResult.success, true);

  // Re-fetch receipt from DB to check subdocument array integrity
  const receiptAfterGood = await InventoryReceipt.findById(receipt._id);
  const updatedItemTop1 = receiptAfterGood.items[0];
  const updatedItemMiddle1 = receiptAfterGood.items[1];
  const updatedItemBottom1 = receiptAfterGood.items[2];

  // CRITICAL CHECK: Product 3 (Bottom) pending must decrement from 8 -> 5, good becomes 3
  assert.equal(
    updatedItemBottom1.qtyPending,
    5,
    "Product 3 (bottom) pending must be decremented to 5"
  );
  assert.equal(
    updatedItemBottom1.qtyGood,
    3,
    "Product 3 (bottom) good must be 3"
  );

  // CRITICAL INVARIANT: Product 1 (Top) MUST REMAIN UNTOUCHED (10 pending, 0 good)
  assert.equal(
    updatedItemTop1.qtyPending,
    10,
    "CRITICAL BUG CHECK: Product 1 (Top) pending stock must NOT be decremented! Remains 10."
  );
  assert.equal(
    updatedItemTop1.qtyGood,
    0,
    "Product 1 (Top) good stock must remain 0"
  );

  // CRITICAL INVARIANT: Product 2 (Middle) MUST REMAIN UNTOUCHED (15 pending, 0 good)
  assert.equal(
    updatedItemMiddle1.qtyPending,
    15,
    "Product 2 (Middle) pending stock must remain 15"
  );
  assert.equal(
    updatedItemMiddle1.qtyGood,
    0,
    "Product 2 (Middle) good stock must remain 0"
  );

  // Product sellable stock check
  const refreshedProdTop1 = await Product.findById(prodTop._id);
  const refreshedProdBottom1 = await Product.findById(prodBottom._id);
  assert.equal(refreshedProdTop1.stock, 10, "Product 1 sellable stock unchanged");
  assert.equal(refreshedProdBottom1.stock, 33, "Product 3 sellable stock increased by 3 (30 + 3 = 33)");

  // 4. Mark 4 units as Defective on Product 2 (MIDDLE PRODUCT)
  const markDefectiveResult = await InventoryService.markDefective(
    {
      receiptId: receipt._id.toString(),
      itemId: itemMiddle._id.toString(),
      quantity: 4,
      defectReason: "Broken",
      description: "Testing middle item defective stock",
    },
    adminUser._id.toString()
  );

  assert.equal(markDefectiveResult.success, true);

  // Re-fetch receipt from DB to check subdocument array integrity
  const receiptAfterDefective = await InventoryReceipt.findById(receipt._id);
  const updatedItemTop2 = receiptAfterDefective.items[0];
  const updatedItemMiddle2 = receiptAfterDefective.items[1];
  const updatedItemBottom2 = receiptAfterDefective.items[2];

  // CRITICAL CHECK: Product 2 (Middle) pending must decrement from 15 -> 11, defective becomes 4
  assert.equal(
    updatedItemMiddle2.qtyPending,
    11,
    "Product 2 (middle) pending must be decremented to 11"
  );
  assert.equal(
    updatedItemMiddle2.qtyDefective,
    4,
    "Product 2 (middle) defective must be 4"
  );

  // CRITICAL INVARIANT: Product 1 (Top) MUST STILL BE 10
  assert.equal(
    updatedItemTop2.qtyPending,
    10,
    "CRITICAL BUG CHECK: Product 1 (Top) pending stock must NOT be touched by defective action! Remains 10."
  );

  // CRITICAL INVARIANT: Product 3 (Bottom) MUST STILL BE 5 pending, 3 good
  assert.equal(
    updatedItemBottom2.qtyPending,
    5,
    "Product 3 (Bottom) pending stock must remain 5"
  );
  assert.equal(
    updatedItemBottom2.qtyGood,
    3,
    "Product 3 (Bottom) good stock must remain 3"
  );

  // Check DefectiveInventory record
  const defectiveBatch = await DefectiveInventory.findOne({ receiptItemId: itemMiddle._id });
  assert.ok(defectiveBatch, "Defective batch must exist for itemMiddle");
  assert.equal(defectiveBatch.product.toString(), prodMiddle._id.toString(), "Defective batch must reference Product 2");
  assert.equal(defectiveBatch.originalQuantity, 4);

  // Clean up DB
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
    throw err;
  }
});
