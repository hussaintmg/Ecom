/* eslint-disable @typescript-eslint/no-require-imports -- Uses the CommonJS test loader to exercise real production route handlers. */
require("./register-ts.cjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const mongoose = require("mongoose");
const { NextRequest } = require("next/server");

// Never use application/cluster credentials in persistence tests.
const database = `ecom_sale_pricing_test_${process.pid}_${Date.now()}`;
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${database}?serverSelectionTimeoutMS=5000`;
process.env.JWT_SECRET = "local-sale-pricing-test-only";

const connectDB = require("../utils/db.ts").default;
const Product = require("../models/Product.ts").default;
const Category = require("../models/Category.ts").default;
const User = require("../models/User.ts").default;
const Invoice = require("../models/Invoice.ts").default;
const CreditSale = require("../models/CreditSale.ts").default;
const Defective = require("../models/DefectiveInventory.ts").default;
const manualPOST = require("../app/api/invoices/route.ts").POST;
const creditPOST = require("../app/api/credit-sales/route.ts").POST;
const creditPATCH = require("../app/api/credit-sales/[id]/route.ts").PATCH;
const defectivePOST = require("../app/api/inventory/defective/[id]/sell/route.ts").POST;
const bulkDefectivePOST = require("../app/api/inventory/defective/bulk-sell/route.ts").POST;
const { signToken } = require("../utils/auth.ts");
const { getInvoicePricing } = require("../utils/salePricing.ts");

test("sale APIs persist correct totals in an isolated local MongoDB database", async t => {
  try {
    await connectDB();
    const category = await Category.create({ name: "Pricing regression" });
    const user = await User.create({ name: "Pricing test", username: "pricing-test", email: "pricing@example.invalid", password: "unused", role: "owner", status: "Approved" });
    const token = signToken({ id: user._id.toString(), role: "owner" });

    async function product(name) {
      return Product.create({ name, description: "Local regression fixture", category: category._id, stock: 20, price: 22000 });
    }
    async function defective(product) {
      return Defective.create({ product: product._id, originalQuantity: 10, availableDefectiveQuantity: 10, defectReason: "Damaged" });
    }
    async function submit(handler, url, body, method = "POST", id) {
      const req = new NextRequest(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json", cookie: `auth_token=${token}` }, body: JSON.stringify(body) });
      const res = await handler(req, id ? { params: Promise.resolve({ id }) } : undefined);
      const json = await res.json();
      assert.ok(res.ok, JSON.stringify({ status: res.status, ...json }));
      return json;
    }
    function assertPrices(record, quantity, total) {
      assert.equal(record.products[0].quantity, quantity);
      assert.equal(record.products[0].salePrice, total);
      assert.equal(record.totalAmount, total);
      const pricing = getInvoicePricing(record.toObject ? record.toObject() : record);
      assert.equal(pricing.items[0].unitPrice, 22000);
      assert.equal(pricing.items[0].lineTotal, total);
      assert.equal(pricing.totalAmount, total);
    }

    for (const [quantity, total] of [[2, 44000], [3, 66000]]) {
      await t.test(`manual sale ${quantity} units: persisted total ${total}`, async () => {
        const p = await product(`Manual ${quantity}`);
        const { invoice } = await submit(manualPOST, "/api/invoices", { customerName: "Local test", products: [{ productId: p.id, quantity, salePrice: total }], type: "Sell" });
        assertPrices(await Invoice.findById(invoice._id), quantity, total);
        assert.equal((await Product.findById(p.id)).stock, 20 - quantity);
      });

      await t.test(`credit sale ${quantity} units: balance and paid invoice retain ${total}`, async () => {
        const p = await product(`Credit ${quantity}`);
        const { creditSale } = await submit(creditPOST, "/api/credit-sales", { customerName: "Local credit test", products: [{ productId: p.id, quantity, salePrice: total }] });
        const saved = await CreditSale.findById(creditSale._id);
        assertPrices(saved, quantity, total);
        assert.equal(saved.remainingAmount, total);
        assert.equal(saved.paidAmount, 0);
        await submit(creditPATCH, `/api/credit-sales/${saved.id}`, { amount: 22000 }, "PATCH", saved.id);
        const partial = await CreditSale.findById(saved.id);
        assert.equal(partial.remainingAmount, total - 22000);
        const { creditSale: paid } = await submit(creditPATCH, `/api/credit-sales/${saved.id}`, { amount: total - 22000 }, "PATCH", saved.id);
        assert.equal(paid.remainingAmount, 0);
        assert.equal(paid.paidAmount, total);
        assert.equal(paid.status, "Paid");
        assertPrices(await Invoice.findById(paid.generatedInvoice._id), quantity, total);
        assert.equal((await Product.findById(p.id)).stock, 20 - quantity);
      });

      await t.test(`single defective sale ${quantity} units: normal stock unchanged`, async () => {
        const p = await product(`Defective ${quantity}`);
        const d = await defective(p);
        const { invoice } = await submit(defectivePOST, `/api/inventory/defective/${d.id}/sell`, { customerName: "Local defective test", quantity, salePrice: total }, "POST", d.id);
        assertPrices(await Invoice.findById(invoice._id), quantity, total);
        assert.equal((await Product.findById(p.id)).stock, 20);
        assert.equal((await Defective.findById(d.id)).availableDefectiveQuantity, 10 - quantity);
      });
    }

    await t.test("bulk defective sale: mixed quantities sum to 110,000", async () => {
      const p1 = await product("Bulk A"), p2 = await product("Bulk B");
      const d1 = await defective(p1), d2 = await defective(p2);
      const { invoice } = await submit(bulkDefectivePOST, "/api/inventory/defective/bulk-sell", { customerName: "Local bulk test", items: [
        { defectiveId: d1.id, quantity: 2, salePrice: 44000 },
        { defectiveId: d2.id, quantity: 3, salePrice: 66000 },
      ] });
      const saved = await Invoice.findById(invoice._id);
      assert.equal(saved.totalAmount, 110000);
      assert.deepEqual(saved.products.map(item => item.salePrice), [44000, 66000]);
      assert.deepEqual(getInvoicePricing(saved.toObject()).items.map(item => item.unitPrice), [22000, 22000]);
      assert.equal((await Product.findById(p1.id)).stock, 20);
      assert.equal((await Product.findById(p2.id)).stock, 20);
      assert.equal((await Defective.findById(d1.id)).availableDefectiveQuantity, 8);
      assert.equal((await Defective.findById(d2.id)).availableDefectiveQuantity, 7);
    });
  } finally {
    if (mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, database);
      assert.match(database, /^ecom_sale_pricing_test_\d+_\d+$/);
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  }
});
