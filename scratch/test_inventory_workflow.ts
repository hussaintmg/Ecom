import mongoose from "mongoose";
import connectDB from "../utils/db";
import Product from "../models/Product";
import Category from "../models/Category";
import InventoryReceipt from "../models/InventoryReceipt";
import DefectiveInventory from "../models/DefectiveInventory";
import RepairJob from "../models/RepairJob";
import StockLog from "../models/StockLog";
import Invoice from "../models/Invoice";
import InventoryService from "../services/inventoryService";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
  }
}

async function runTests() {
  console.log("===============================================================");
  console.log("🚀 STARTING REAL COMPREHENSIVE INVENTORY WORKFLOW TEST SUITE");
  console.log("===============================================================");

  await connectDB();
  console.log("📦 Connected to MongoDB:", mongoose.connection.name);

  const testUserId = new mongoose.Types.ObjectId().toString();
  const testSku = `TEST-SKU-${Date.now()}`;

  // Step 0: Setup master product with valid category and images
  console.log("\n--- Setup: Master Product Creation ---");
  let testCat = await Category.findOne();
  let createdCat = false;
  if (!testCat) {
    testCat = await Category.create({ name: `Test Category ${Date.now()}` });
    createdCat = true;
  }

  const testProduct = await Product.create({
    name: "Test Inventory Master Product",
    description: "Automated test item description",
    images: [{ url: "https://example.com/test.jpg", publicId: "test_img_001" }],
    category: testCat._id,
    stock: 5, // Authoritative initial sellable stock
    price: 1500,
    barcode: testSku,
  });

  const productId = testProduct._id.toString();
  assert(testProduct.stock === 5, "Product created with initial sellable stock = 5");

  // Scenario 1, 2, 3: Receive new stock
  console.log("\n--- Test Suite 1: Stock Receiving ---");
  const receiveResult = await InventoryService.receiveStock(
    {
      notes: "PO-TEST-001 delivery",
      items: [
        {
          productId,
          sku: testSku,
          qtyReceived: 3,
          unitCost: 1000,
        },
      ],
    },
    testUserId
  );

  const receipt = (receiveResult as any).receipt || receiveResult;
  const itemId = receipt.items[0]._id.toString();

  assert(receipt !== null, "InventoryReceipt created successfully");
  assert(receipt.items[0].qtyReceived === 3, "Receipt item qtyReceived is 3");
  assert(receipt.items[0].qtyPending === 3, "Receipt item qtyPending is 3");
  assert(receipt.items[0].qtyGood === 0, "Receipt item qtyGood is 0");
  assert(receipt.items[0].qtyDefective === 0, "Receipt item qtyDefective is 0");

  const productAfterReceive = await Product.findById(productId);
  assert(
    productAfterReceive?.stock === 5,
    "INVARIANT 1: Receiving stock does NOT immediately increase sellable stock (remains 5)"
  );

  const receiveLog = await StockLog.findOne({
    product: productId,
    movementType: "receiving_pending",
  });
  assert(receiveLog !== null, "StockLog created for receiving_pending with toState 'Pending Inspection'");

  // Scenario 11, 12, 13: Invalid inspection quantities rejection
  console.log("\n--- Test Suite 2: Quantity Validations & Edge Cases ---");
  try {
    await InventoryService.markGood(
      { receiptId: receipt._id.toString(), itemId, quantity: 0 },
      testUserId
    );
    assert(false, "Reject quantity 0 (should have thrown)");
  } catch (err: any) {
    assert(err.message.includes("positive whole number"), "Rejected quantity 0 correctly");
  }

  try {
    await InventoryService.markGood(
      { receiptId: receipt._id.toString(), itemId, quantity: -2 },
      testUserId
    );
    assert(false, "Reject negative quantity (should have thrown)");
  } catch (err: any) {
    assert(err.message.includes("positive whole number"), "Rejected negative quantity correctly");
  }

  try {
    await InventoryService.markGood(
      { receiptId: receipt._id.toString(), itemId, quantity: 4 },
      testUserId
    );
    assert(false, "Reject quantity exceeding pending (should have thrown)");
  } catch (err: any) {
    assert(err.message.includes("less than requested"), "Rejected quantity > pending correctly");
  }

  // Scenario 15: Concurrency / Race Condition Test
  console.log("\n--- Test Suite 3: Concurrency & Atomic Race Condition Test ---");
  // Pending is 3. We launch two simultaneous requests to mark 2 good each (total 4 > 3).
  // Exactly one must succeed, or atomic safety must guarantee pending never drops below 0!
  const [race1, race2] = await Promise.allSettled([
    InventoryService.markGood(
      { receiptId: receipt._id.toString(), itemId, quantity: 2 },
      testUserId
    ),
    InventoryService.markGood(
      { receiptId: receipt._id.toString(), itemId, quantity: 2 },
      testUserId
    ),
  ]);

  const successes = [race1, race2].filter((r) => r.status === "fulfilled").length;
  const failures = [race1, race2].filter((r) => r.status === "rejected").length;
  assert(
    successes === 1 && failures === 1,
    "CONCURRENCY GUARD: Exactly 1 concurrent request succeeded when 2x2 requested for 3 pending"
  );

  const receiptAfterRace = await InventoryReceipt.findById(receipt._id);
  const raceItem = receiptAfterRace?.items.find((i: any) => i._id.toString() === itemId);
  assert(raceItem?.qtyGood === 2, "Atomic race item qtyGood is exactly 2");
  assert(raceItem?.qtyPending === 1, "Atomic race item qtyPending is exactly 1");

  const productAfterRace = await Product.findById(productId);
  assert(productAfterRace?.stock === 7, "Product sellable stock increased by exactly 2 (now 7)");

  // Reset/test single inspection: Mark remaining 1 as defective
  console.log("\n--- Test Suite 4: Mark Defective ---");
  const defectiveRes = await InventoryService.markDefective(
    {
      receiptId: receipt._id.toString(),
      itemId,
      quantity: 1,
      defectReason: "Broken",
      description: "Cracked housing found during QA",
    },
    testUserId
  );

  assert(defectiveRes.success === true, "Mark defective returned success");
  assert(defectiveRes.remainingPending === 0, "Pending quantity is now 0");

  const receiptComplete = await InventoryReceipt.findById(receipt._id);
  const completedItem = receiptComplete?.items.find((i: any) => i._id.toString() === itemId);
  assert(completedItem?.inspectionStatus === "Completed", "Item inspection marked completed");
  assert(receiptComplete?.status === "Inspection Completed", "Receipt overall status marked completed");

  const productAfterDefective = await Product.findById(productId);
  assert(
    productAfterDefective?.stock === 7,
    "INVARIANT 3: Mark defective does NOT increase sellable stock (remains 7)"
  );

  const defectiveRecord = await DefectiveInventory.findById(defectiveRes.defectiveRecord._id);
  assert(defectiveRecord !== null, "DefectiveInventory record created");
  assert(defectiveRecord?.availableDefectiveQuantity === 1, "Available defective quantity is 1");
  assert(defectiveRecord?.quantityRepairing === 0, "Quantity repairing is 0");
  assert(defectiveRecord?.defectReason === "Broken", "Defect reason matches 'Broken'");

  // Scenario 16, 17, 18, 19, 20, 21: Repair Workflow (Start & Complete Success)
  console.log("\n--- Test Suite 5: Repair Workflow (Successful) ---");
  const startRepairRes = await InventoryService.startRepair(
    {
      defectiveId: defectiveRecord!._id.toString(),
      quantity: 1,
      technicianOrVendor: "TechMaster Lab",
      estimatedCost: 200,
      notes: "Replace cracked housing",
    },
    testUserId
  );

  assert(startRepairRes.success === true, "startRepair returned success");
  const defectiveAfterStart = await DefectiveInventory.findById(defectiveRecord!._id);
  assert(defectiveAfterStart?.availableDefectiveQuantity === 0, "Defective stock decreased to 0");
  assert(defectiveAfterStart?.quantityRepairing === 1, "Repairing stock increased to 1");

  const repairJob = await RepairJob.findById(startRepairRes.repairJob._id);
  assert(repairJob?.status === "In Progress", "RepairJob created with status 'In Progress'");

  // Complete Repair - Successful
  const completeRepairRes = await InventoryService.completeRepair(
    {
      repairJobId: repairJob!._id.toString(),
      successfulQty: 1,
      failedQty: 0,
      actualCost: 200,
      notes: "Housing replaced successfully",
    },
    testUserId
  );

  assert(completeRepairRes.success === true, "completeRepair returned success");
  const defectiveAfterComplete = await DefectiveInventory.findById(defectiveRecord!._id);
  assert(defectiveAfterComplete?.quantityRepairing === 0, "Repairing quantity decreased to 0");
  assert(defectiveAfterComplete?.repairCostSpent === 200, "Repair cost stored (200)");

  const productAfterRepair = await Product.findById(productId);
  assert(
    productAfterRepair?.stock === 8,
    "INVARIANT 11: Successful repair increased sellable stock to 8 (7 + 1)"
  );

  // Scenario 22, 23, 24, 25: Partial Repair (Fail + Success)
  console.log("\n--- Test Suite 6: Partial Repair (2 Success, 1 Fail) ---");
  // Receive a batch of 3, mark all 3 defective
  const batch2Receive = await InventoryService.receiveStock(
    {
      notes: "Batch 2 for repair testing",
      items: [{ productId, sku: testSku, qtyReceived: 3, unitCost: 1000 }],
    },
    testUserId
  );
  const batch2Receipt = (batch2Receive as any).receipt || batch2Receive;
  const batch2ItemId = batch2Receipt.items[0]._id.toString();
  const batch2Defective = await InventoryService.markDefective(
    {
      receiptId: batch2Receipt._id.toString(),
      itemId: batch2ItemId,
      quantity: 3,
      defectReason: "Manufacturing Defect",
    },
    testUserId
  );

  const def2Id = batch2Defective.defectiveRecord._id.toString();
  const repairJob2Res = await InventoryService.startRepair(
    {
      defectiveId: def2Id,
      quantity: 3,
      technicianOrVendor: "Precision Fix Corp",
      estimatedCost: 600,
    },
    testUserId
  );

  // Complete with 2 successful, 1 failed
  await InventoryService.completeRepair(
    {
      repairJobId: repairJob2Res.repairJob._id.toString(),
      successfulQty: 2,
      failedQty: 1,
      actualCost: 500,
      notes: "2 repaired, 1 unrepairable mainboard",
    },
    testUserId
  );

  const def2After = await DefectiveInventory.findById(def2Id);
  assert(def2After?.availableDefectiveQuantity === 1, "Failed unit returned to available defective (1)");
  assert(def2After?.quantityRepairing === 0, "Repairing quantity is now 0");

  const productAfterPartial = await Product.findById(productId);
  assert(
    productAfterPartial?.stock === 10,
    "Sellable stock increased by exactly 2 for the 2 successful repairs (8 + 2 = 10)"
  );

  // Scenario 26, 27: Scrap Workflow
  console.log("\n--- Test Suite 7: Scrap Defective Stock ---");
  const scrapRes = await InventoryService.scrapDefective(
    {
      defectiveId: def2Id,
      quantity: 1,
      reason: "Beyond Repair",
      scrapRecoveryValue: 100,
      notes: "Sold to electronics recycler",
    },
    testUserId
  );

  assert(scrapRes.success === true, "scrapDefective returned success");
  const def2Scrapped = await DefectiveInventory.findById(def2Id);
  assert(def2Scrapped?.availableDefectiveQuantity === 0, "Available defective quantity decreased to 0");
  assert(def2Scrapped?.quantityScrapped === 1, "Quantity scrapped is now 1");

  const productAfterScrap = await Product.findById(productId);
  assert(
    productAfterScrap?.stock === 10,
    "INVARIANT 10: Scrapped stock does NOT increase sellable stock (remains 10)"
  );

  // Scenario 28, 29, 30, 31: Defective Sale (Sell As-Is)
  console.log("\n--- Test Suite 8: Defective Sale (Sell As-Is with Invoice) ---");
  // Create another defective item of qty 2
  const batch3Receive = await InventoryService.receiveStock(
    {
      notes: "Batch 3 for defective sale testing",
      items: [{ productId, sku: testSku, qtyReceived: 2, unitCost: 1000 }],
    },
    testUserId
  );
  const batch3Receipt = (batch3Receive as any).receipt || batch3Receive;
  const batch3ItemId = batch3Receipt.items[0]._id.toString();
  const batch3Defective = await InventoryService.markDefective(
    {
      receiptId: batch3Receipt._id.toString(),
      itemId: batch3ItemId,
      quantity: 2,
      defectReason: "Cosmetic Damage",
    },
    testUserId
  );

  const def3Id = batch3Defective.defectiveRecord._id.toString();

  const sellDefectiveRes = await InventoryService.sellDefective(
    {
      defectiveId: def3Id,
      quantity: 1,
      salePrice: 800,
      customerName: "Alice Walker",
      customerPhone: "+15551234567",
      customerAddress: "123 Discount Ave",
      customerCity: "Chicago",
      notes: "Sold with scratch on back",
    },
    testUserId
  );

  assert(sellDefectiveRes.success === true, "sellDefective returned success");
  const def3Sold = await DefectiveInventory.findById(def3Id);
  assert(def3Sold?.availableDefectiveQuantity === 1, "Defective stock decreased by 1 (now 1)");
  assert(def3Sold?.quantitySold === 1, "Quantity sold is 1");

  const productAfterSellDefective = await Product.findById(productId);
  assert(
    productAfterSellDefective?.stock === 10,
    "INVARIANT 12: Defective sale does NOT touch sellable stock (remains 10)"
  );

  // Check generated Invoice
  const invoice = await Invoice.findById(sellDefectiveRes.invoice._id);
  assert(invoice !== null, "Existing Invoice document created for defective sale");
  assert(invoice?.stockAlreadyDeducted === true, "Invoice has stockAlreadyDeducted = true flag");
  assert(invoice?.customerName === "Alice Walker", "Invoice customer matches 'Alice Walker'");
  assert(
    invoice?.products[0]?.description?.includes("Defective"),
    "Invoice product description contains 'Defective' tag"
  );
  assert(invoice?.totalAmount === 800, "Invoice totalAmount matches sale price 800");

  // Test Suite 9: Inventory Overview & Multi-State Consistency
  console.log("\n--- Test Suite 9: Combined Inventory Overview ($facet Aggregation) ---");
  const overview = await InventoryService.getInventoryOverview({ search: testSku });
  assert(overview.products.length > 0, "Overview returned test product row");
  const overviewRow = overview.products.find((p: any) => p._id.toString() === productId);

  console.log("  📊 Current Stock Breakdown for Product:");
  console.log(`     Sellable:   ${overviewRow?.stock}`);
  console.log(`     Pending:    ${overviewRow?.pendingStock}`);
  console.log(`     Defective:  ${overviewRow?.defectiveStock}`);
  console.log(`     Repairing:  ${overviewRow?.repairingStock}`);
  console.log(`     Total Physical Active: ${overviewRow?.totalPhysicalActiveStock}`);

  assert(overviewRow?.stock === 10, "Overview Sellable stock is 10");
  assert(overviewRow?.pendingStock === 0, "Overview Pending stock is 0");
  assert(overviewRow?.defectiveStock === 1, "Overview Defective stock is 1 (batch 3 remaining)");
  assert(overviewRow?.repairingStock === 0, "Overview Repairing stock is 0");
  assert(
    overviewRow?.totalPhysicalActiveStock === 11,
    "INVARIANT 5: Total Physical Active = Sellable (10) + Defective (1) = 11"
  );

  // Cleanup test data
  console.log("\n--- Cleanup ---");
  await Product.findByIdAndDelete(productId);
  await InventoryReceipt.deleteMany({ "items.productId": productId });
  await DefectiveInventory.deleteMany({ productId });
  await RepairJob.deleteMany({ productId });
  await StockLog.deleteMany({ productId });
  if (invoice?._id) await Invoice.findByIdAndDelete(invoice._id);
  console.log("🧹 Test product and associated test records cleaned up.");

  console.log("\n===============================================================");
  console.log(`🏁 TEST RUN SUMMARY: ${passedTests} passed, ${failedTests} failed out of ${totalTests} checks`);
  console.log("===============================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Unhandled Test Error:", err);
    process.exit(1);
  });
