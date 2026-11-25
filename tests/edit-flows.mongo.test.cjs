/* eslint-disable @typescript-eslint/no-require-imports */
require("./register-ts.cjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const mongoose = require("mongoose");
const { NextRequest } = require("next/server");

const database = `ecom_edit_flows_test_${process.pid}_${Date.now()}`;
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${database}?serverSelectionTimeoutMS=5000`;
process.env.JWT_SECRET = "local-edit-flows-test-secret";

const connectDB = require("../utils/db.ts").default;
const Product = require("../models/Product.ts").default;
const Category = require("../models/Category.ts").default;
const User = require("../models/User.ts").default;
const Invoice = require("../models/Invoice.ts").default;
const CreditSale = require("../models/CreditSale.ts").default;
const InventoryReceipt = require("../models/InventoryReceipt.ts").default;
const DefectiveInventory = require("../models/DefectiveInventory.ts").default;
const RepairJob = require("../models/RepairJob.ts").default;
const StockLog = require("../models/StockLog.ts").default;
const { signToken } = require("../utils/auth.ts");
const InventoryService = require("../services/inventoryService.ts").default;

const invoicePUT = require("../app/api/invoices/[id]/route.ts").PUT;
const creditSalePUT = require("../app/api/credit-sales/[id]/route.ts").PUT;
const receiptPUT = require("../app/api/inventory/receipts/[id]/route.ts").PUT;
const repairChallanPUT = require("../app/api/inventory/repairs/challan/[invoiceNo]/route.ts").PUT;

const makeReq = (url, method, body, token) =>
  new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth_token=${token}`,
    },
    body: JSON.stringify(body),
  });

test("Multi-product add/swap/remove/resize edit flows across Invoice, CreditSale, Receipt, and Repair Challans", async () => {
  try {
    await connectDB();

    const category = await Category.create({ name: "Test Hardware" });
    const owner = await User.create({
      name: "Owner Tester",
      username: `owner_edit_${Date.now()}`,
      email: `owner_edit_${Date.now()}@test.local`,
      password: "pwd",
      role: "owner",
      status: "Approved",
    });
    const token = signToken({ id: owner._id.toString(), role: "owner" });

    const prodA = await Product.create({
      name: "Product A",
      description: "Alpha",
      category: category._id,
      stock: 10,
      price: 1000,
    });
    const prodB = await Product.create({
      name: "Product B",
      description: "Beta",
      category: category._id,
      stock: 15,
      price: 2000,
    });
    const prodC = await Product.create({
      name: "Product C",
      description: "Gamma",
      category: category._id,
      stock: 8,
      price: 3000,
    });

    // ====================================================
    // 1. INVOICE EDIT: Swap A->B, keep & add C, verify stock & total
    // ====================================================
    const invoice = await Invoice.create({
      customerName: "Walk-in Buyer",
      products: [
        { product: prodA._id, category: category._id, quantity: 3, salePrice: 3000, description: "Old A" },
      ],
      totalAmount: 3000,
      type: "Sell",
      stockAlreadyDeducted: false,
      soldBy: owner._id,
    });

    const invRes = await invoicePUT(
      makeReq(
        `http://localhost/api/invoices/${invoice._id}`,
        "PUT",
        {
          customerName: "Updated Buyer",
          products: [
            { productId: prodB._id.toString(), quantity: 2, salePrice: 4000, description: "Swapped to B" },
            { productId: prodC._id.toString(), quantity: 3, salePrice: 9000, description: "Added C" },
          ],
        },
        token
      ),
      { params: Promise.resolve({ id: invoice._id.toString() }) }
    );
    const invJson = await invRes.json();
    assert.equal(invRes.status, 200, `Invoice PUT failed: ${JSON.stringify(invJson)}`);
    assert.equal(invJson.success, true);
    assert.equal(invJson.invoice.totalAmount, 13000);
    assert.equal(invJson.invoice.products.length, 2);

    const aAfterInv = await Product.findById(prodA._id);
    const bAfterInv = await Product.findById(prodB._id);
    const cAfterInv = await Product.findById(prodC._id);
    assert.equal(aAfterInv.stock, 13, "Removed Prod A (+3 restored -> 13)");
    assert.equal(bAfterInv.stock, 13, "Added Prod B (-2 deducted -> 13)");
    assert.equal(cAfterInv.stock, 5, "Added Prod C (-3 deducted -> 5)");

    // ====================================================
    // 2. CREDIT SALE EDIT: Swap B->A, update total & remainingAmount, guard paidAmount
    // ====================================================
    const creditSale = await CreditSale.create({
      customerName: "Credit Client",
      products: [
        { product: prodB._id, category: category._id, quantity: 4, salePrice: 8000, description: "Initial B" },
      ],
      totalAmount: 8000,
      paidAmount: 2000,
      remainingAmount: 6000,
      status: "Open",
      createdBy: owner._id,
    });

    // Reject if new total < paidAmount (2000)
    const badCreditRes = await creditSalePUT(
      makeReq(
        `http://localhost/api/credit-sales/${creditSale._id}`,
        "PUT",
        {
          customerName: "Credit Client",
          products: [
            { productId: prodA._id.toString(), quantity: 1, salePrice: 1000, description: "Too cheap" },
          ],
        },
        token
      ),
      { params: Promise.resolve({ id: creditSale._id.toString() }) }
    );
    assert.equal(badCreditRes.status, 400, "Must reject credit total below already paidAmount");

    // Valid credit swap B(4) -> A(5) + C(1)
    const okCreditRes = await creditSalePUT(
      makeReq(
        `http://localhost/api/credit-sales/${creditSale._id}`,
        "PUT",
        {
          customerName: "Updated Credit Client",
          products: [
            { productId: prodA._id.toString(), quantity: 5, salePrice: 5000, description: "Swapped A" },
            { productId: prodC._id.toString(), quantity: 1, salePrice: 3500, description: "Added C" },
          ],
        },
        token
      ),
      { params: Promise.resolve({ id: creditSale._id.toString() }) }
    );
    const okCreditJson = await okCreditRes.json();
    assert.equal(okCreditRes.status, 200, `Credit PUT failed: ${JSON.stringify(okCreditJson)}`);
    assert.equal(okCreditJson.creditSale.totalAmount, 8500);
    assert.equal(okCreditJson.creditSale.remainingAmount, 6500);

    const aAfterCr = await Product.findById(prodA._id);
    const bAfterCr = await Product.findById(prodB._id);
    const cAfterCr = await Product.findById(prodC._id);
    assert.equal(aAfterCr.stock, 8, "Prod A: 13 - 5 = 8");
    assert.equal(bAfterCr.stock, 17, "Prod B: 13 + 4 = 17 (restored from credit)");
    assert.equal(cAfterCr.stock, 4, "Prod C: 5 - 1 = 4");

    // ====================================================
    // 3. STOCK RECEIPT EDIT: Protected inspected row + swap uninspected + add item
    // ====================================================
    const receipt = await InventoryReceipt.create({
      receiptNumber: `REC-EDIT-${Date.now()}`,
      vendor: "Taiwan Parts Co",
      status: "Partially Inspected",
      receivedBy: owner._id,
      items: [
        {
          product: prodA._id,
          qtyReceived: 5,
          qtyPending: 3,
          qtyGood: 2,
          qtyDefective: 0,
          unitCost: 700,
          inspectionStatus: "Partially Inspected",
        },
        {
          product: prodB._id,
          qtyReceived: 4,
          qtyPending: 4,
          qtyGood: 0,
          qtyDefective: 0,
          unitCost: 1400,
          inspectionStatus: "Pending",
        },
      ],
    });

    const badRecRes = await receiptPUT(
      makeReq(
        `http://localhost/api/inventory/receipts/${receipt._id}`,
        "PUT",
        {
          vendor: "Taiwan Parts Co",
          items: [
            { _id: receipt.items[0]._id.toString(), productId: prodA._id.toString(), qtyReceived: 1, unitCost: 700 },
          ],
        },
        token
      ),
      { params: Promise.resolve({ id: receipt._id.toString() }) }
    );
    assert.equal(badRecRes.status, 400, "Cannot shrink qtyReceived below inspected units (2)");

    const okRecRes = await receiptPUT(
      makeReq(
        `http://localhost/api/inventory/receipts/${receipt._id}`,
        "PUT",
        {
          vendor: "Updated Taiwan Co",
          items: [
            // Keep item 0, raise qtyReceived 5 -> 7 (pending becomes 7 - 2 = 5)
            { _id: receipt.items[0]._id.toString(), productId: prodA._id.toString(), qtyReceived: 7, unitCost: 750 },
            // Swap uninspected item 1 from prodB -> prodC with qty 6
            { _id: receipt.items[1]._id.toString(), productId: prodC._id.toString(), qtyReceived: 6, unitCost: 2100 },
            // Add brand new item prodB qty 3
            { productId: prodB._id.toString(), qtyReceived: 3, unitCost: 1500 },
          ],
        },
        token
      ),
      { params: Promise.resolve({ id: receipt._id.toString() }) }
    );
    const okRecJson = await okRecRes.json();
    assert.equal(okRecRes.status, 200, `Receipt PUT failed: ${JSON.stringify(okRecJson)}`);
    assert.equal(okRecJson.receipt.items.length, 3);
    assert.equal(okRecJson.receipt.items[0].qtyPending, 5);
    assert.equal(okRecJson.receipt.items[1].product._id.toString(), prodC._id.toString());
    assert.equal(okRecJson.receipt.items[2].qtyPending, 3);

    // ====================================================
    // 4. REPAIR CHALLAN EDIT (Defective & Customer): Swap, add, adjust DefectiveInventory
    // ====================================================
    const defA = await DefectiveInventory.create({
      product: prodA._id,
      originalQuantity: 6,
      availableDefectiveQuantity: 4,
      quantityRepairing: 2,
      defectReason: "Damaged",
      status: "Partially In Repair",
    });
    const defB = await DefectiveInventory.create({
      product: prodB._id,
      originalQuantity: 5,
      availableDefectiveQuantity: 5,
      quantityRepairing: 0,
      defectReason: "Broken",
      status: "Awaiting Decision",
    });

    const challanNo = `REP-EDIT-${Date.now()}`;
    const defJob = await RepairJob.create({
      defectiveInventory: defA._id,
      product: prodA._id,
      quantity: 2,
      repairSource: "defective",
      technicianOrVendor: "Tech Ali",
      repairInvoiceNo: challanNo,
      estimatedCost: 500,
      status: "In Progress",
    });

    const repRes = await repairChallanPUT(
      makeReq(
        `http://localhost/api/inventory/repairs/challan/${challanNo}`,
        "PUT",
        {
          technicianOrVendor: "Tech Usman",
          items: [
            // Reduce defA from 2 -> 1
            {
              repairJobId: defJob._id.toString(),
              productId: prodA._id.toString(),
              defectiveId: defA._id.toString(),
              quantity: 1,
              estimatedCost: 600,
            },
            // Add defB qty 3
            {
              productId: prodB._id.toString(),
              defectiveId: defB._id.toString(),
              quantity: 3,
              estimatedCost: 800,
            },
          ],
        },
        token
      ),
      { params: Promise.resolve({ invoiceNo: challanNo }) }
    );
    const repJson = await repRes.json();
    assert.equal(repRes.status, 200, `Repair Challan PUT failed: ${JSON.stringify(repJson)}`);

    const defAAfter = await DefectiveInventory.findById(defA._id);
    const defBAfter = await DefectiveInventory.findById(defB._id);
    assert.equal(defAAfter.availableDefectiveQuantity, 5, "defA freed 1 unit back to available (4+1=5)");
    assert.equal(defAAfter.quantityRepairing, 1, "defA repairing reduced to 1");
    assert.equal(defBAfter.availableDefectiveQuantity, 2, "defB deducted 3 units for repair (5-3=2)");
    assert.equal(defBAfter.quantityRepairing, 3, "defB repairing increased to 3");

    const updatedJobs = await RepairJob.find({ repairInvoiceNo: challanNo });
    assert.equal(updatedJobs.length, 2);

    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  } catch (err) {
    console.error("EDIT FLOW TEST ERROR:", err);
    throw err;
  }
});
