# Repair Bill Enhancement & Customer Repair Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable both Customer Product Repairs and Store Defective Stock Repairs on the owner/admin Repair Bill page with multi-product staging, comprehensive repair invoices/challans containing proper item tables, robust print/PDF generation, and accurate stock management for both streams.

**Architecture:** 
1. Extend `RepairJob` schema to make `defectiveInventory` optional and introduce `repairSource` ("customer" | "defective"), customer details, and challan linkage.
2. Update `InventoryService.dispatchToRepairVendor` and `/api/inventory/repairs/dispatch` to handle both "customer" and "defective" flows, staging multiple products per challan, generating multi-product Invoices and RepairJobs.
3. Update repair completion logic to only alter store inventory for "defective" stock repairs, keeping customer product repairs independent of store stock.
4. Enhance `RepairBillContent.tsx` with a dual-mode selector ("Customer Repair" vs "Store Defective Stock"), product picker from catalog for customer repairs, multi-item staging table, and grouped challan reprinting.
5. Upgrade `BillModal.tsx` and `BillTemplate.tsx` with print/PDF styling (`@media print`, `print-color-adjust: exact`, table layout for multi-item repair challans) and popup-safe printing.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Mongoose/MongoDB, Tailwind CSS, Lucide Icons, html2pdf.js.

---

### Task 1: Update RepairJob Model & InventoryService for Customer & Defective Repairs

**Files:**
- Modify: `c:/Freelance/Ecom/models/RepairJob.ts`
- Modify: `c:/Freelance/Ecom/services/inventoryService.ts`
- Test: `c:/Freelance/Ecom/scratch/test_repair_service.ts`

- [ ] **Step 1: Update `models/RepairJob.ts` schema**
  - Make `defectiveInventory` optional (`required: false`).
  - Add `repairSource: { type: String, enum: ["customer", "defective"], default: "defective", index: true }`.
  - Add `customerName: { type: String, default: "", trim: true }`.
  - Add `customerPhone: { type: String, default: "", trim: true }`.
  - Add `customerAddress: { type: String, default: "", trim: true }`.

- [ ] **Step 2: Update `InventoryService.dispatchToRepairVendor`**
  - Support `repairSource`: `"customer" | "defective"`.
  - For `"defective"`: validate available defective quantity, decrement available stock, increment `quantityRepairing`, and log stock movement.
  - For `"customer"`: do NOT touch store stock or defective inventory; look up product info from `Product` model.
  - For all items: generate a shared `repairInvoiceNo`, create `RepairJob` records, and create an `Invoice` with `type: "Repair"` containing all items in `products` array.
  - Return complete `billData` containing all items, invoiceNo, dates, vendor/customer information.

- [ ] **Step 3: Update `InventoryService.completeRepairJob`**
  - If `job.repairSource === "customer"`: update status, actualCost, completionDate, and notes without altering `DefectiveInventory` or product stock.
  - If `job.repairSource === "defective"`: perform current stock restoration (sellable stock + defective stock return).

- [ ] **Step 4: Add `InventoryService.getChallanByInvoiceNo` or update `getRepairJobs`**
  - Enable retrieving all items in a repair challan by `repairInvoiceNo` for full reprinting.

---

### Task 2: Update API Endpoints for Dispatch, Tracking, and Products Selection

**Files:**
- Modify: `c:/Freelance/Ecom/app/api/inventory/repairs/dispatch/route.ts`
- Modify: `c:/Freelance/Ecom/app/api/inventory/repairs/route.ts`
- Modify: `c:/Freelance/Ecom/app/api/inventory/repairs/[id]/complete/route.ts`
- Create: `c:/Freelance/Ecom/app/api/inventory/repairs/challan/[invoiceNo]/route.ts`

- [ ] **Step 1: Update dispatch route to accept customer details and repairSource**
  - Validate vendorName and customer details based on `repairSource`.
  - Forward `repairSource` to `InventoryService.dispatchToRepairVendor`.

- [ ] **Step 2: Add challan lookup endpoint**
  - Create `/api/inventory/repairs/challan/[invoiceNo]/route.ts` that returns the complete invoice and all linked repair jobs for that challan number.

- [ ] **Step 3: Update repair tracking API to return `repairSource`, `customerName`, etc.**
  - Ensure filters support filtering by `repairSource` if needed.

---

### Task 3: Enhance `RepairBillContent.tsx` UI for Customer & Defective Repair

**Files:**
- Modify: `c:/Freelance/Ecom/components/dashboard/RepairBillContent.tsx`

- [ ] **Step 1: Add Repair Source Toggle in Dispatch Form**
  - Provide an intuitive switch:
    - 🛒 **Customer Product Repair** (Customer brings device for service/repair)
    - 🏭 **Store Defective Stock** (Our warehouse/shop damaged inventory sent to vendor)
- [ ] **Step 2: Implement Catalog Product Picker for Customer Repair**
  - When in "Customer Repair" mode: fetch active products (`/api/products`), allow searching/selecting product, entering quantity, fault description, and repair charges.
  - When in "Store Defective Stock" mode: show defective stock picker with available quantity and defect reason.
- [ ] **Step 3: Support Multi-Product Staging**
  - Allow adding multiple items to the current challan table with individual quantities, defect faults, and estimated costs.
  - Show staged items with thumbnail, product name, defect fault, quantity, estimated cost, and remove button.
- [ ] **Step 4: Customer Details vs Vendor Details Fields**
  - For Customer Repair: Customer Name, Phone, Address, assigned Technician/Vendor (optional or e.g. "Internal / Viraj").
  - For Defective Stock: Vendor/Technician Name, Phone, Workshop Address.
- [ ] **Step 5: Enhance Dispatched Tracking Table**
  - Display badges: `Customer Repair` vs `Store Defective`.
  - Show Challan # with "Print Challan" button that prints the FULL multi-product challan.
  - Receive / Complete modal tailored to repair source (shows whether stock will be restored or returned to customer).

---

### Task 4: Upgrade `BillTemplate.tsx` & `BillModal.tsx` for Flawless Multi-Item Printing & PDF

**Files:**
- Modify: `c:/Freelance/Ecom/components/BillTemplate.tsx`
- Modify: `c:/Freelance/Ecom/components/BillModal.tsx`

- [ ] **Step 1: Enhance `BillTemplate.tsx` layout for Repair Invoices**
  - Distinct headers for "CUSTOMER REPAIR RECEIPT" vs "VENDOR REPAIR CHALLAN / INVOICE".
  - Multi-item table with columns: `#`, `Item & Fault Details`, `Qty`, `Est. Cost / Charges (PKR)`, `Subtotal (PKR)`.
  - Display Customer Name, Phone, Address, Vendor / Workshop Name, Return Date, Notes.
  - Print optimization: remove `minHeight: 100vh` in print mode, use clean margins, set `print-color-adjust: exact`.
- [ ] **Step 2: Upgrade `BillModal.tsx` for printing & PDF reliability**
  - Implement fallback iframe printing (bypasses browser popup blockers).
  - Ensure html2pdf renders without cutoff or blank extra pages.
  - Test print and download actions.

---

### Task 5: End-to-End Verification & Testing

- [ ] **Step 1: Run automated verification script for backend service & API**
  - Verify dispatch of customer repairs (stock unaffected).
  - Verify dispatch of defective stock (defective stock reserved).
  - Verify multi-product dispatch generates invoice with multiple items.
  - Verify repair completion for customer vs defective.
- [ ] **Step 2: Test UI on localhost:3005 / localhost:3009**
  - Verify tab navigation, product selection, staging, invoice generation, reprint, and completion.
- [ ] **Step 3: Verification against all user requirements**
