# Sale price calculation fix implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement and verify this authorized bug fix in the current session.

**Goal:** Display the correct unit rate and line subtotal for manual, credit, and defective sales, verify against local MongoDB, build, and push.

**Architecture:** Sale `salePrice` already stores the total for the item's entire quantity. Centralize presentation calculations so that the rate is `salePrice / quantity` and the subtotal is `salePrice`. Preserve repair dispatches, whose estimates are unit rates, and repair invoices created by the older total-price endpoint.

**Tech Stack:** Next.js 16.2, React 19, TypeScript, Mongoose 9, Node's test runner.

**Spec:** User request in this chat: quantity 2 and entered total 44,000 must yield unit rate 22,000, total 44,000; check quantities 2 and 3, all three sale flows, PDF, build and push. Historical repair is authorized only for a configured cluster using database `ecom`.

## Global constraints

- Read installed Next.js documentation before code changes (route handlers and environment variables read).
- Keep the established sale storage contract; do not divide stored sale totals.
- Do not modify historical local records. The configured URI is local `Ecom_23`, not an `ecom` cluster.
- Integration tests use a unique temporary database on local MongoDB and remove only that database afterwards.

## Review focus

- Multi-item and repeated-product sales retain their summed totals.
- A missing total falls back to line totals; explicit zero remains zero.
- Legacy single-item sales use total-price semantics.
- Repair unit estimates and older repair line totals retain their existing values.
- Defective sales leave normal stock unchanged; credit payments and conversion retain the correct total.

### Task 1: Regression tests and shared presentation calculations

**Files:** Create `tests/register-ts.cjs`, `tests/sale-pricing.test.cjs`, `utils/salePricing.ts`. Modify `components/BillTemplate.tsx`, `utils/downloadInvoicePDF.ts`, `components/dashboard/InvoiceCustomer.tsx`, `app/admin/invoices/page.tsx`, `app/owner/invoices/page.tsx`, and `package.json`.

**Interface:** `getInvoicePricing(invoice)` returns normalized items with `unitPrice` and `lineTotal`, plus `totalAmount`; input supports nested and legacy items, invoice type, and optional totals.

- [ ] Render the existing bill, customer details, and PDF HTML for quantity 2/total 44,000 and quantity 3/total 66,000. Assert rates 22,000, subtotals 44,000/66,000 and no 88,000/198,000.
- [ ] Run `node --test tests/sale-pricing.test.cjs` and observe the existing multiplication fault.
- [ ] Add shared pricing and use it in every affected display; PDF has separate Rate and Subtotal columns.
- [ ] Add fallback, zero, decimal, legacy, multi-item and both Repair format cases. Run the same tests to green.

### Task 2: Real local persistence, build and push

**Files:** Create `tests/sale-pricing.mongo.test.cjs` and a `test:mongo` package script.

- [ ] Use actual production route handlers and Mongoose with temporary local fixtures. Submit quantity 2/44,000 and quantity 3/66,000 to manual, credit, single defective and bulk defective sale flows. Read MongoDB records and assert totals, rate calculations, credit balances, stock changes and generated paid-credit invoices.
- [ ] Run `npm.cmd run test:mongo`, `npm.cmd test`, lint for changed files, and `npm.cmd run build`. Review any pre-existing project-wide lint failures separately.
- [ ] Request an independent code review, address material findings, then commit and push to the configured remote branch.
- [ ] Recheck configured URI without printing credentials. Run historical audit/repair only if it targets cluster database `ecom`; current local configuration fails that condition, so historical writes are skipped.
