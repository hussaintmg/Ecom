/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { test } = require("node:test");

const BASE_URL = "http://localhost:3000";

test("Live HTTP E2E: Stock Receiving markGood & markDefective via running Next.js server", async () => {
  // 1. Authenticate against live server
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginId: "admin@ecom.local",
      password: "AdminPass123!",
    }),
  });

  assert.equal(loginRes.status, 200, "Login must succeed with 200");
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const match = setCookie.match(/auth_token=([^;]+)/);
  assert.ok(match, "auth_token cookie must be present in response");
  const authCookie = `auth_token=${match[1]}`;

  // 2. Fetch receipts list
  const receiptsRes = await fetch(`${BASE_URL}/api/inventory/receipts?limit=5`, {
    headers: { Cookie: authCookie },
  });
  assert.equal(receiptsRes.status, 200, "Receipts endpoint must return 200");
  const receiptsData = await receiptsRes.json();
  assert.equal(receiptsData.success, true);

  // Find multi-test shipment
  const targetReceipt = receiptsData.receipts.find(
    (r) => r.items && r.items.length === 3 && r.status !== "Inspection Completed"
  );
  assert.ok(targetReceipt, "Shipment with 3 items must exist");

  const receiptId = targetReceipt._id;
  const itemTop = targetReceipt.items[0];
  const itemMiddle = targetReceipt.items[1];
  const itemBottom = targetReceipt.items[2];

  console.log(`Testing Live Receipt: ${targetReceipt.receiptNumber} (${receiptId})`);
  console.log(`- Item 0 (Top): ${itemTop.product?.name || itemTop.product} (Pending: ${itemTop.qtyPending})`);
  console.log(`- Item 1 (Middle): ${itemMiddle.product?.name || itemMiddle.product} (Pending: ${itemMiddle.qtyPending})`);
  console.log(`- Item 2 (Bottom): ${itemBottom.product?.name || itemBottom.product} (Pending: ${itemBottom.qtyPending})`);

  const initialTopPending = itemTop.qtyPending;
  const initialMiddlePending = itemMiddle.qtyPending;
  const initialBottomPending = itemBottom.qtyPending;

  // 3. Mark 2 units Good on Item 2 (BOTTOM PRODUCT)
  const markGoodRes = await fetch(
    `${BASE_URL}/api/inventory/receipts/${receiptId}/items/${itemBottom._id}/mark-good`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        quantity: 2,
        notes: "Automated live HTTP mark-good verification",
      }),
    }
  );

  assert.equal(markGoodRes.status, 200, "mark-good endpoint must return 200");
  const markGoodJson = await markGoodRes.json();
  assert.equal(markGoodJson.success, true);

  // 4. Fetch receipt details and assert subdocument isolation
  const check1Res = await fetch(`${BASE_URL}/api/inventory/receipts/${receiptId}`, {
    headers: { Cookie: authCookie },
  });
  const check1Data = await check1Res.json();
  assert.equal(check1Data.success, true);

  const check1Items = check1Data.receipt.items;
  const check1Top = check1Items[0];
  const check1Middle = check1Items[1];
  const check1Bottom = check1Items[2];

  // ASSERTION: Bottom item pending decreased by 2
  assert.equal(
    check1Bottom.qtyPending,
    initialBottomPending - 2,
    `Bottom item pending must decrease by 2 (${initialBottomPending} -> ${initialBottomPending - 2})`
  );
  assert.equal(check1Bottom.qtyGood, 2, "Bottom item qtyGood must be 2");

  // CRITICAL BUG VERIFICATION: Top item pending MUST NOT DECREMENT!
  assert.equal(
    check1Top.qtyPending,
    initialTopPending,
    `CRITICAL VERIFICATION: Top product pending must remain strictly untouched! (${initialTopPending})`
  );
  assert.equal(check1Top.qtyGood, 0, "Top product qtyGood must remain 0");

  // Middle item pending MUST NOT DECREMENT!
  assert.equal(
    check1Middle.qtyPending,
    initialMiddlePending,
    `Middle product pending must remain strictly untouched! (${initialMiddlePending})`
  );

  console.log("PASS: Mark Good on Bottom Item correctly isolated! Top & Middle items untouched.");

  // 5. Mark 3 units Defective on Item 1 (MIDDLE PRODUCT)
  const markDefRes = await fetch(
    `${BASE_URL}/api/inventory/receipts/${receiptId}/items/${itemMiddle._id}/mark-defective`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
      body: JSON.stringify({
        quantity: 3,
        defectReason: "Broken",
        description: "Automated live HTTP mark-defective verification",
      }),
    }
  );

  assert.equal(markDefRes.status, 200, "mark-defective endpoint must return 200");
  const markDefJson = await markDefRes.json();
  assert.equal(markDefJson.success, true);

  // 6. Fetch receipt details again and assert subdocument isolation
  const check2Res = await fetch(`${BASE_URL}/api/inventory/receipts/${receiptId}`, {
    headers: { Cookie: authCookie },
  });
  const check2Data = await check2Res.json();
  assert.equal(check2Data.success, true);

  const check2Items = check2Data.receipt.items;
  const check2Top = check2Items[0];
  const check2Middle = check2Items[1];
  const check2Bottom = check2Items[2];

  // ASSERTION: Middle item pending decreased by 3
  assert.equal(
    check2Middle.qtyPending,
    initialMiddlePending - 3,
    `Middle item pending must decrease by 3 (${initialMiddlePending} -> ${initialMiddlePending - 3})`
  );
  assert.equal(check2Middle.qtyDefective, 3, "Middle item qtyDefective must be 3");

  // CRITICAL BUG VERIFICATION: Top item pending MUST STILL BE UNTOUCHED!
  assert.equal(
    check2Top.qtyPending,
    initialTopPending,
    `CRITICAL VERIFICATION: Top product pending must remain strictly untouched! (${initialTopPending})`
  );

  // Bottom item pending MUST STILL BE unchanged from step 4
  assert.equal(
    check2Bottom.qtyPending,
    initialBottomPending - 2,
    "Bottom product pending must remain unchanged from step 4"
  );
  assert.equal(check2Bottom.qtyGood, 2, "Bottom product qtyGood must remain 2");

  console.log("PASS: Mark Defective on Middle Item correctly isolated! Top & Bottom items untouched.");
});
