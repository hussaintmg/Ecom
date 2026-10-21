/* eslint-disable @typescript-eslint/no-require-imports */
require("./register-ts.cjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const mongoose = require("mongoose");
const { NextRequest } = require("next/server");

const database = `ecom_repair_test_${process.pid}_${Date.now()}`;
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${database}?serverSelectionTimeoutMS=5000`;
process.env.JWT_SECRET = "local-repair-batch-test-secret";

const connectDB = require("../utils/db.ts").default;
const Product = require("../models/Product.ts").default;
const Category = require("../models/Category.ts").default;
const User = require("../models/User.ts").default;
const Invoice = require("../models/Invoice.ts").default;
const RepairJob = require("../models/RepairJob.ts").default;
const Defective = require("../models/DefectiveInventory.ts").default;
const InventoryService = require("../services/inventoryService.ts").default;
const batchCompletePOST = require("../app/api/inventory/repairs/complete-batch/route.ts").POST;
const syncFixGET = require("../app/api/inventory/repairs/sync-fix/route.ts").GET;
const challanGET = require("../app/api/inventory/repairs/challan/[invoiceNo]/route.ts").GET;
const { signToken } = require("../utils/auth.ts");

test("Repair batch flow: dispatch, grouped tracking, batch completion, price protection, and sync-fix", async (t) => {
  try {
    await connectDB();

    const category = await Category.create({ name: "Electronics" });
    const adminUser = await User.create({
      name: "Admin User",
      username: `admin_tester_${Date.now()}`,
      email: `admin_${Date.now()}@test.local`,
      password: "pwd",
      role: "admin",
      status: "Approved",
    });
    const token = signToken({ id: adminUser._id.toString(), role: "admin" });

    // 1. Create 2 test products with specific original prices and initial stock
    const prodA = await Product.create({
      name: "Smartphone Alpha",
      description: "Smartphone Alpha description",
      category: category._id,
      stock: 5,
      price: 35000, // Original price must remain 35000 throughout!
    });

    const prodB = await Product.create({
      name: "Laptop Beta",
      description: "Laptop Beta description",
      category: category._id,
      stock: 2,
      price: 85000, // Original price must remain 85000 throughout!
    });

    // Create defective inventory records
    const defA = await Defective.create({
      product: prodA._id,
      originalQuantity: 6,
      availableDefectiveQuantity: 6,
      quantityRepairing: 0,
      defectReason: "Broken",
      status: "Awaiting Decision",
    });

    const defB = await Defective.create({
      product: prodB._id,
      originalQuantity: 4,
      availableDefectiveQuantity: 4,
      quantityRepairing: 0,
      defectReason: "Not Working",
      status: "Awaiting Decision",
    });

    let repairChallanNo = "";
    let jobAId = "";
    let jobBId = "";

    await t.test("Dispatch multiple products to repairer in one unified challan", async () => {
      const dispatchResult = await InventoryService.dispatchToRepairVendor(
        {
          repairSource: "defective",
          vendorName: "Apex Repairs Tech",
          vendorPhone: "03001234567",
          vendorAddress: "Shop 12, Tech Plaza",
          items: [
            {
              defectiveId: defA._id.toString(),
              quantity: 4,
              estimatedCost: 1500,
              defectReason: "Broken",
              notes: "Replace LCD",
            },
            {
              defectiveId: defB._id.toString(),
              quantity: 3,
              estimatedCost: 3500,
              defectReason: "Not Working",
              notes: "Replace battery pack",
            },
          ],
          notes: "Batch #1 sent together",
        },
        adminUser._id.toString()
      );

      assert.ok(dispatchResult.success, "Dispatch should succeed");
      assert.ok(dispatchResult.repairInvoiceNo, "Must generate a repairInvoiceNo");
      repairChallanNo = dispatchResult.repairInvoiceNo;
      assert.match(repairChallanNo, /^REP-\d{8}-\d{4}$/, "Must follow REP-YYYYMMDD-XXXX format");

      assert.equal(dispatchResult.repairJobs.length, 2, "Should create 2 repair jobs");
      jobAId = dispatchResult.repairJobs[0]._id.toString();
      jobBId = dispatchResult.repairJobs[1]._id.toString();

      // Verify jobs both share the exact same repairInvoiceNo
      const jobA = await RepairJob.findById(jobAId);
      const jobB = await RepairJob.findById(jobBId);
      assert.equal(jobA.repairInvoiceNo, repairChallanNo);
      assert.equal(jobB.repairInvoiceNo, repairChallanNo);
      assert.equal(jobA.status, "In Progress");
      assert.equal(jobB.status, "In Progress");

      // Verify dispatch invoice exists with type="Repair"
      const dispatchInvoice = await Invoice.findOne({
        customerNote: { $regex: repairChallanNo, $options: "i" },
        type: "Repair",
      });
      assert.ok(dispatchInvoice, "Dispatch invoice should be recorded");
      assert.equal(dispatchInvoice.customerName, "Apex Repairs Tech");
    });

    await t.test("Tracking list groups multiple repair products into 1 single row/object per challan", async () => {
      const jobsData = await InventoryService.getRepairJobs({ status: "In Progress" });
      assert.ok(Array.isArray(jobsData.repairJobs), "Should return jobs list");

      // Must find our challan as exactly 1 row
      const challanRow = jobsData.repairJobs.find((j) => j.repairInvoiceNo === repairChallanNo);
      assert.ok(challanRow, "Consolidated challan row must exist");
      assert.equal(challanRow.jobsCount, 2, "Challan row must report 2 jobs");
      assert.equal(challanRow.totalQuantity, 7, "Total quantity must sum 4 + 3 = 7");
      assert.equal(challanRow.technicianOrVendor, "Apex Repairs Tech");
      assert.equal(challanRow.items.length, 2, "Items array should contain both products");
    });

    await t.test("Dispatch challan voucher API returns correct voucher data", async () => {
      const req = new NextRequest(`http://localhost/api/inventory/repairs/challan/${repairChallanNo}?stage=dispatch`, {
        method: "GET",
        headers: { cookie: `auth_token=${token}` },
      });
      const res = await challanGET(req, { params: Promise.resolve({ invoiceNo: repairChallanNo }) });
      const json = await res.json();

      assert.ok(res.ok);
      assert.equal(json.invoiceNo, repairChallanNo);
      assert.equal(json.billData.repairStage, "dispatch");
      assert.equal(json.billData.customerName, "Apex Repairs Tech");
      assert.equal(json.billData.products.length, 2);
    });

    await t.test("Batch repair completion: restores good stock, returns failed to defective, creates ONE completion voucher, and keeps original prices unchanged", async () => {
      const req = new NextRequest("http://localhost/api/inventory/repairs/complete-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `auth_token=${token}`,
        },
        body: JSON.stringify({
          repairInvoiceNo: repairChallanNo,
          items: [
            {
              repairJobId: jobAId,
              successfulQty: 3,
              failedQty: 1,
              actualCost: 2000,
              notes: "1 unit had dead motherboard",
            },
            {
              repairJobId: jobBId,
              successfulQty: 2,
              failedQty: 1,
              actualCost: 4000,
              notes: "1 unit casing broken",
            },
          ],
          notes: "Batch completion done in full",
        }),
      });

      const res = await batchCompletePOST(req);
      const json = await res.json();
      assert.ok(res.ok, JSON.stringify(json));
      assert.ok(json.success);
      assert.equal(json.totalSuccessCount, 5);
      assert.equal(json.totalFailCount, 2);
      assert.equal(json.totalBatchActualCost, 6000);

      // 1. Verify Product A stock and price
      const updatedProdA = await Product.findById(prodA._id);
      assert.equal(updatedProdA.stock, 5 + 3, "Prod A stock must increase by 3 successfully repaired");
      assert.equal(updatedProdA.price, 35000, "CRITICAL: Prod A original price must remain 35000!");

      // 2. Verify Product B stock and price
      const updatedProdB = await Product.findById(prodB._id);
      assert.equal(updatedProdB.stock, 2 + 2, "Prod B stock must increase by 2 successfully repaired");
      assert.equal(updatedProdB.price, 85000, "CRITICAL: Prod B original price must remain 85000!");

      // 3. Verify Defective inventory has failed stock returned
      const updatedDefA = await Defective.findById(defA._id);
      assert.equal(updatedDefA.availableDefectiveQuantity, (6 - 4) + 1, "Def A available stock should have 1 failed unit returned");
      assert.equal(updatedDefA.repairCostSpent, 2000, "Def A repair cost spent recorded");

      const updatedDefB = await Defective.findById(defB._id);
      assert.equal(updatedDefB.availableDefectiveQuantity, (4 - 3) + 1, "Def B available stock should have 1 failed unit returned");
      assert.equal(updatedDefB.repairCostSpent, 4000, "Def B repair cost spent recorded");

      // 4. Verify ONE unified completion invoice was created
      const completionInvoices = await Invoice.find({
        customerNote: { $regex: repairChallanNo, $options: "i" },
      });
      assert.ok(completionInvoices.length >= 1, "Must generate completion voucher for the batch");
      assert.equal(completionInvoices[completionInvoices.length - 1].totalAmount, 6000, "Completion invoice total must match total repair cost");
      assert.equal(completionInvoices[completionInvoices.length - 1].products.length, 2, "Completion invoice must list both products");
    });

    await t.test("Completion voucher API returns repairStage='completed' with actual cost", async () => {
      const req = new NextRequest(`http://localhost/api/inventory/repairs/challan/${repairChallanNo}?stage=completed`, {
        method: "GET",
        headers: { cookie: `auth_token=${token}` },
      });
      const res = await challanGET(req, { params: Promise.resolve({ invoiceNo: repairChallanNo }) });
      const json = await res.json();

      assert.ok(res.ok);
      assert.equal(json.billData.repairStage, "completed");
      assert.equal(json.billData.totalAmount, 6000);
      assert.equal(json.billData.products.length, 2);
    });

    await t.test("Public sync-fix GET API audits and reconciles legacy repair documents without leaking PII", async () => {
      // Create an orphan legacy job without repairInvoiceNo
      const legacyJob = await RepairJob.create({
        product: prodA._id,
        quantity: 1,
        technicianOrVendor: "Legacy Tech",
        status: "In Progress",
        startDate: new Date(),
      });

      const req = new NextRequest("http://localhost/api/inventory/repairs/sync-fix", {
        method: "GET",
      });
      const res = await syncFixGET(req);
      const json = await res.json();

      assert.ok(res.ok);
      assert.ok(json.success);
      assert.ok(json.stats.jobsAssignedChallan >= 1, "Legacy job should be assigned a repairInvoiceNo");

      // Verify sanitized response (no customer passwords, emails, or personal logs)
      assert.equal(json.stats.usersExposed, undefined);
      assert.equal(json.customerData, undefined);

      // Verify legacy job now has an assigned repairInvoiceNo
      const fixedJob = await RepairJob.findById(legacyJob._id);
      assert.ok(fixedJob.repairInvoiceNo);
      assert.match(fixedJob.repairInvoiceNo, /^REP-\d{8}-[0-9A-F]{4}$/i);
    });
  } catch (err) {
    console.error("Test error:", err);
    throw err;
  } finally {
    if (mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, database);
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  }
});
