/* eslint-disable @typescript-eslint/no-require-imports -- Uses the CommonJS test loader and captures the browser-only PDF engine boundary. */
require("./register-ts.cjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");
const { AuthProvider } = require("../context/AuthContext.tsx");
const BillTemplate = require("../components/BillTemplate.tsx").default;
const { CustomerDetailsModal } = require("../components/dashboard/InvoiceCustomer.tsx");

// Capture the real HTML at the browser PDF engine boundary. Calculations and
// markup run unchanged; canvas/PDF rendering requires a browser.
let pdfHTML = "";
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "html2pdf.js") {
    return () => ({
      set() { return this; },
      from(element) { pdfHTML = element.innerHTML; return this; },
      async save() {},
    });
  }
  return originalLoad.call(this, request, ...args);
};
const { downloadInvoicePDF } = require("../utils/downloadInvoicePDF.ts");
Module._load = originalLoad;

function billHTML(invoice) {
  return renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: {} },
    React.createElement(AuthProvider, null,
      React.createElement(BillTemplate, { data: { invoiceNo: "TEST", date: "03 Oct 2026", ...invoice } }))));
}

function tableCells(html) {
  return [...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(match => match[1].replace(/<[^>]+>/g, "").trim());
}

async function renderedPDF(invoice) {
  global.document = {
    createElement() {
      return { style: {}, innerHTML: "", get firstElementChild() { return { innerHTML: this.innerHTML }; }, querySelectorAll() { return []; } };
    },
    body: { appendChild() {}, removeChild() {} },
  };
  try { await downloadInvoicePDF(invoice); return pdfHTML; }
  finally { delete global.document; }
}

for (const type of ["Sell", "Credit", "Sell (As-Is Defective)"]) {
  for (const [quantity, salePrice] of [[2, 44000], [3, 66000]]) {
    const invoice = { type, totalAmount: salePrice, products: [{ productName: "Test motor", quantity, salePrice, description: "" }] };
    test(`${type} bill: ${quantity} units show 22,000 rate and ${salePrice} subtotal`, () => {
      const cells = tableCells(billHTML(invoice));
      assert.equal(cells[2], "Rs. 22,000");
      assert.equal(cells[3], `Rs. ${salePrice.toLocaleString()}`);
      assert.doesNotMatch(billHTML(invoice), new RegExp(`Rs\\. ${(salePrice * quantity).toLocaleString()}`));
    });
    test(`${type} downloadable PDF: rate and subtotal agree with entered total`, async () => {
      const cells = tableCells(await renderedPDF(invoice));
      assert.equal(cells[2], "Rs. 22,000");
      assert.equal(cells[3], `Rs. ${salePrice.toLocaleString()}`);
    });
  }
}

test("customer sale details show 44,000 for two units, without doubling", () => {
  const html = renderToStaticMarkup(React.createElement(CustomerDetailsModal, {
    open: true, onClose() {}, invoice: { type: "Sell", totalAmount: 44000, products: [{ product: { name: "Motor" }, quantity: 2, salePrice: 44000 }] },
  }));
  assert.match(html, /44,000/);
  assert.doesNotMatch(html, /88,000/);
});

test("Repair dispatch keeps its estimated per-unit rate", async () => {
  const invoice = { type: "Repair", totalAmount: 5900, products: [
    { productName: "A", quantity: 1, salePrice: 1500, description: "" },
    { productName: "B", quantity: 2, salePrice: 2200, description: "" },
  ] };
  const cells = tableCells(billHTML(invoice));
  assert.equal(cells[6], "Rs. 2,200");
  assert.equal(cells[7], "Rs. 4,400");
  assert.match(billHTML(invoice), /5,900/);
  const pdfCells = tableCells(await renderedPDF(invoice));
  assert.equal(pdfCells[6], "Rs. 2,200");
  assert.equal(pdfCells[7], "Rs. 4,400");
});

test("sale fallback sums line totals, including repeated products", async () => {
  const invoice = { type: "Sell", products: [
    { productName: "Motor", quantity: 2, salePrice: 44000, description: "" },
    { productName: "Motor", quantity: 3, salePrice: 66000, description: "" },
  ] };
  assert.match(billHTML(invoice), /110,000/);
  assert.doesNotMatch(billHTML(invoice), /286,000/);
  const pdf = await renderedPDF(invoice);
  assert.match(pdf, /110,000/);
  assert.doesNotMatch(pdf, /286,000/);
});

test("explicit zero total is respected", async () => {
  const invoice = { type: "Sell", totalAmount: 0, products: [{ productName: "A", quantity: 2, salePrice: 100, description: "" }] };
  assert.match(billHTML(invoice), /PKR 0/);
  assert.match(await renderedPDF(invoice), /PKR 0/);
});

test("legacy single-item bill and PDF retain total-price semantics", async () => {
  const invoice = { productName: "Motor", quantity: 2, totalPrice: 44000 };
  const cells = tableCells(billHTML(invoice));
  assert.equal(cells[2], "Rs. 22,000");
  assert.equal(cells[3], "Rs. 44,000");
  const pdfCells = tableCells(await renderedPDF({ product: { name: "Motor" }, quantity: 2, salePrice: 44000 }));
  assert.equal(pdfCells[2], "Rs. 22,000");
  assert.equal(pdfCells[3], "Rs. 44,000");
});

test("decimal rate is displayed to two decimals without changing the subtotal", async () => {
  const invoice = { type: "Sell", products: [{ productName: "Motor", quantity: 3, salePrice: 44000, description: "" }] };
  for (const html of [billHTML(invoice), await renderedPDF(invoice)]) {
    assert.equal(tableCells(html)[2], "Rs. 14,666.67");
    assert.equal(tableCells(html)[3], "Rs. 44,000");
    assert.match(html, /44,000/);
  }
});

test("old repair endpoint line totals are preserved", async () => {
  const invoice = { type: "Repair", totalAmount: 44000, products: [{ productName: "Motor", quantity: 2, salePrice: 44000, description: "" }] };
  for (const html of [billHTML(invoice), await renderedPDF(invoice)]) {
    assert.equal(tableCells(html)[2], "Rs. 22,000");
    assert.equal(tableCells(html)[3], "Rs. 44,000");
  }
});

test("missing repair total falls back to per-unit estimates", async () => {
  const invoice = { type: "Repair", products: [{ productName: "Motor", quantity: 3, salePrice: 1500, description: "" }] };
  for (const html of [billHTML(invoice), await renderedPDF(invoice)]) {
    assert.equal(tableCells(html)[2], "Rs. 1,500");
    assert.equal(tableCells(html)[3], "Rs. 4,500");
    assert.match(html, /4,500/);
  }
});
