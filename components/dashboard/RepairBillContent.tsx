"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import TooltipCell from "@/components/ui/TooltipCell";
import BillModal from "@/components/BillModal";
import { toast } from "@/components/ui/Toast";
import {
  Wrench,
  Search,
  Package,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ShoppingBag,
  Info,
  Check,
} from "lucide-react";

interface RepairBillContentProps {
  basePath?: string; // "/admin" or "/owner"
}

interface StagedRepairItem {
  source: "customer" | "defective";
  productId: string;
  defectiveId?: string;
  productName: string;
  productImage?: string;
  defectReason: string;
  availableQty?: number;
  quantity: number;
  estimatedCost: number;
  notes: string;
}

export const RepairBillContent: React.FC<RepairBillContentProps> = ({
  basePath = "/admin",
}) => {
  const [activeTab, setActiveTab] = useState<"dispatch" | "tracking">("dispatch");

  // ── Mode Switcher: "customer" vs "defective" ──
  const [repairSource, setRepairSource] = useState<"customer" | "defective">("customer");

  // ── Dispatch Form State ──
  // Customer details (for Customer Repair)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Vendor / Technician details (for both or workshop assignment)
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatching, setDispatching] = useState(false);

  // ── Customer Repair: Product Catalog State ──
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // ── Store Defective Stock State ──
  const [defectiveItems, setDefectiveItems] = useState<any[]>([]);
  const [loadingDefective, setLoadingDefective] = useState(false);
  const [selectedDefectiveId, setSelectedDefectiveId] = useState("");

  // Shared item staging inputs
  const [selectedQty, setSelectedQty] = useState("1");
  const [selectedEstCost, setSelectedEstCost] = useState("0");
  const [selectedDefectReason, setSelectedDefectReason] = useState("");
  const [selectedItemNote, setSelectedItemNote] = useState("");

  // Staged items for current dispatch challan (Multi-product support)
  const [stagedItems, setStagedItems] = useState<StagedRepairItem[]>([]);

  // ── Bill Modal State ──
  const [showBillModal, setShowBillModal] = useState(false);
  const [lastBillData, setLastBillData] = useState<any>(null);
  const [reprintingChallanNo, setReprintingChallanNo] = useState<string | null>(null);

  // ── Tracking State ──
  const [repairJobs, setRepairJobs] = useState<any[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [vendorsList, setVendorsList] = useState<string[]>([]);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("All");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [searchTracking, setSearchTracking] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(false);

  // ── Complete Repair Modal State ──
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeJobToComplete, setActiveJobToComplete] = useState<any>(null);
  const [successQty, setSuccessQty] = useState("0");
  const [failQty, setFailQty] = useState("0");
  const [actualCost, setActualCost] = useState("0");
  const [completeNotes, setCompleteNotes] = useState("");
  const [completing, setCompleting] = useState(false);

  // Fetch product catalog for customer repairs
  const fetchCatalogProducts = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch("/api/products?limit=100");
      const data = await res.json();
      if (data.products) {
        setCatalogProducts(data.products);
      }
    } catch (err) {
      console.error("Error fetching catalog products:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  // Fetch available defective inventory
  const fetchDefectiveInventory = useCallback(async () => {
    setLoadingDefective(true);
    try {
      const res = await fetch("/api/inventory/defective?hasAvailable=true&limit=100");
      const data = await res.json();
      if (data.defective) {
        setDefectiveItems(data.defective);
      }
    } catch (err) {
      console.error("Error fetching defective inventory:", err);
    } finally {
      setLoadingDefective(false);
    }
  }, []);

  // Fetch repair jobs for tracking
  const fetchRepairJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "15");
      if (selectedSourceFilter !== "All") params.append("source", selectedSourceFilter);
      if (selectedVendorFilter !== "All") params.append("vendor", selectedVendorFilter);
      if (selectedStatusFilter !== "All") params.append("status", selectedStatusFilter);
      if (searchTracking.trim()) params.append("search", searchTracking.trim());

      const res = await fetch(`/api/inventory/repairs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRepairJobs(data.repairJobs || []);
        setTotalJobs(data.totalJobs || 0);
        setTotalPages(data.totalPages || 1);
        if (data.vendors) {
          setVendorsList(data.vendors);
        }
      }
    } catch (err) {
      console.error("Error fetching repair jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  }, [currentPage, selectedSourceFilter, selectedVendorFilter, selectedStatusFilter, searchTracking]);

  useEffect(() => {
    fetchCatalogProducts();
    fetchDefectiveInventory();
  }, [fetchCatalogProducts, fetchDefectiveInventory]);

  useEffect(() => {
    fetchRepairJobs();
  }, [fetchRepairJobs]);

  // Filtered catalog products for customer repair picker
  const filteredCatalogProducts = useMemo(() => {
    if (!productSearch.trim()) return catalogProducts;
    const q = productSearch.toLowerCase();
    return catalogProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        (typeof p.category === "object" && p.category?.name?.toLowerCase().includes(q))
    );
  }, [catalogProducts, productSearch]);

  // Handle stage item for Customer Repair
  const handleStageCustomerItem = () => {
    if (!selectedProductId) {
      toast.error("Please select a product for customer repair.");
      return;
    }
    const prod = catalogProducts.find((p) => p._id === selectedProductId);
    if (!prod) return;

    const qty = parseInt(selectedQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive whole number.");
      return;
    }

    const estCost = parseFloat(selectedEstCost) || 0;
    const defect = selectedDefectReason.trim() || selectedItemNote.trim() || "Customer Reported Fault";

    // Append to staged items list
    setStagedItems((prev) => [
      ...prev,
      {
        source: "customer",
        productId: prod._id,
        productName: prod.name || "Customer Product",
        productImage: prod.images?.[0]?.url,
        defectReason: defect,
        quantity: qty,
        estimatedCost: estCost,
        notes: selectedItemNote.trim(),
      },
    ]);

    // Reset selection
    setSelectedProductId("");
    setSelectedQty("1");
    setSelectedEstCost("0");
    setSelectedDefectReason("");
    setSelectedItemNote("");
    toast.success(`Added "${prod.name}" to repair challan.`);
  };

  // Handle stage item for Store Defective Stock
  const handleStageDefectiveItem = () => {
    if (!selectedDefectiveId) {
      toast.error("Please select a defective stock batch.");
      return;
    }
    const def = defectiveItems.find((d) => d._id === selectedDefectiveId);
    if (!def) return;

    const qty = parseInt(selectedQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number.");
      return;
    }
    if (qty > def.availableDefectiveQuantity) {
      toast.error(`Only ${def.availableDefectiveQuantity} units available in this batch.`);
      return;
    }

    const estCost = parseFloat(selectedEstCost) || 0;

    // Check if already staged to update quantity
    const existingIdx = stagedItems.findIndex(
      (it) => it.source === "defective" && it.defectiveId === selectedDefectiveId
    );

    if (existingIdx >= 0) {
      const updated = [...stagedItems];
      const newQty = updated[existingIdx].quantity + qty;
      if (newQty > def.availableDefectiveQuantity) {
        toast.error(`Cannot exceed ${def.availableDefectiveQuantity} available defective units.`);
        return;
      }
      updated[existingIdx].quantity = newQty;
      updated[existingIdx].estimatedCost = estCost;
      updated[existingIdx].notes = selectedItemNote || updated[existingIdx].notes;
      setStagedItems(updated);
    } else {
      setStagedItems((prev) => [
        ...prev,
        {
          source: "defective",
          productId: def.product?._id || def.product,
          defectiveId: def._id,
          productName: def.product?.name || "Product",
          productImage: def.product?.images?.[0]?.url,
          defectReason: def.defectReason || "Store Defect",
          availableQty: def.availableDefectiveQuantity,
          quantity: qty,
          estimatedCost: estCost,
          notes: selectedItemNote.trim(),
        },
      ]);
    }

    // Reset selection
    setSelectedDefectiveId("");
    setSelectedQty("1");
    setSelectedEstCost("0");
    setSelectedItemNote("");
    toast.success("Added defective stock item to challan.");
  };

  // Quick action: Add all available defective batches to challan
  const handleStageAllDefective = () => {
    if (defectiveItems.length === 0) {
      toast.error("No defective stock batches available.");
      return;
    }

    const newItems: StagedRepairItem[] = defectiveItems
      .filter((def) => def.availableDefectiveQuantity > 0)
      .map((def) => ({
        source: "defective",
        productId: def.product?._id || def.product,
        defectiveId: def._id,
        productName: def.product?.name || "Product",
        productImage: def.product?.images?.[0]?.url,
        defectReason: def.defectReason || "Defective Batch",
        availableQty: def.availableDefectiveQuantity,
        quantity: def.availableDefectiveQuantity,
        estimatedCost: 0,
        notes: "Batch dispatch",
      }));

    setStagedItems((prev) => [...prev, ...newItems]);
    toast.success(`Staged ${newItems.length} defective batches into challan.`);
  };

  const handleRemoveStagedItem = (index: number) => {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit dispatch to repair vendor / generate customer challan
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (repairSource === "customer" && !customerName.trim()) {
      toast.error("Please enter the Customer Name.");
      return;
    }
    if (repairSource === "defective" && !vendorName.trim()) {
      toast.error("Please enter the Vendor / Technician name (e.g. Viraj, Poonam).");
      return;
    }
    if (stagedItems.length === 0) {
      toast.error("Please add at least one product item to the repair challan.");
      return;
    }

    setDispatching(true);
    try {
      const res = await fetch("/api/inventory/repairs/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairSource,
          vendorName: vendorName.trim() || (repairSource === "customer" ? "Customer Service" : "Vendor"),
          vendorPhone: vendorPhone.trim(),
          vendorAddress: vendorAddress.trim(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          expectedReturnDate: expectedReturnDate || undefined,
          notes: dispatchNotes.trim(),
          items: stagedItems.map((it) => ({
            productId: it.productId,
            defectiveId: it.defectiveId,
            quantity: it.quantity,
            defectReason: it.defectReason,
            estimatedCost: it.estimatedCost,
            notes: it.notes,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Repair Challan generated successfully!");

        // Open printable BillModal with the generated challan
        if (data.billData) {
          setLastBillData(data.billData);
          setShowBillModal(true);
        }

        // Reset form
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setVendorName("");
        setVendorPhone("");
        setVendorAddress("");
        setExpectedReturnDate("");
        setDispatchNotes("");
        setStagedItems([]);

        // Refresh defective inventory & repair jobs
        fetchDefectiveInventory();
        fetchRepairJobs();
      } else {
        toast.error(data.error || "Failed to dispatch repair.");
      }
    } catch (err: any) {
      console.error("Dispatch error:", err);
      toast.error("Network error while dispatching repair.");
    } finally {
      setDispatching(false);
    }
  };

  // Open complete repair modal
  const handleOpenCompleteModal = (job: any) => {
    setActiveJobToComplete(job);
    setSuccessQty(job.quantity.toString());
    setFailQty("0");
    setActualCost(job.estimatedCost ? (job.estimatedCost * job.quantity).toString() : "0");
    setCompleteNotes("");
    setCompleteModalOpen(true);
  };

  // Submit complete repair
  const handleSubmitComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobToComplete) return;

    const sQty = parseInt(successQty, 10);
    const fQty = parseInt(failQty, 10);
    if (isNaN(sQty) || sQty < 0 || isNaN(fQty) || fQty < 0) {
      toast.error("Quantities must be positive whole numbers.");
      return;
    }
    if (sQty + fQty !== activeJobToComplete.quantity) {
      toast.error(
        `Total outcome (${sQty} repaired + ${fQty} failed = ${sQty + fQty}) must equal total job quantity (${activeJobToComplete.quantity}).`
      );
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch(`/api/inventory/repairs/${activeJobToComplete._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successfulQty: sQty,
          failedQty: fQty,
          actualCost: parseFloat(actualCost) || 0,
          notes: completeNotes.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          data.message ||
            (activeJobToComplete.repairSource === "customer"
              ? "Customer repair marked complete! Handed over to customer."
              : "Repair completed successfully! Stock updated.")
        );
        setCompleteModalOpen(false);
        setActiveJobToComplete(null);
        fetchRepairJobs();
        fetchDefectiveInventory();
      } else {
        toast.error(data.error || "Failed to complete repair.");
      }
    } catch {
      toast.error("Network error while completing repair.");
    } finally {
      setCompleting(false);
    }
  };

  // Reprint / view existing full challan
  const handleReprintJob = async (job: any) => {
    const invNo = job.repairInvoiceNo;
    if (invNo) {
      setReprintingChallanNo(invNo);
      try {
        const res = await fetch(`/api/inventory/repairs/challan/${encodeURIComponent(invNo)}`);
        const data = await res.json();
        if (res.ok && data.success && data.billData) {
          setLastBillData(data.billData);
          setShowBillModal(true);
          setReprintingChallanNo(null);
          return;
        }
      } catch (err) {
        console.error("Error fetching full challan:", err);
      }
      setReprintingChallanNo(null);
    }

    // Fallback if challan endpoint fails
    const billData = {
      invoiceNo: job.repairInvoiceNo || `REP-${job._id.slice(-6).toUpperCase()}`,
      date: new Date(job.startDate || job.createdAt).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      customerName:
        job.repairSource === "customer"
          ? job.customerName || "Customer"
          : job.technicianOrVendor || "Repair Vendor",
      customerPhone: job.repairSource === "customer" ? job.customerPhone : job.vendorPhone,
      customerAddress: job.repairSource === "customer" ? job.customerAddress : job.vendorAddress,
      type: "Repair",
      repairSource: job.repairSource || (job.defectiveInventory ? "defective" : "customer"),
      technicianOrVendor: job.technicianOrVendor || "",
      totalAmount: (job.estimatedCost || 0) * job.quantity,
      products: [
        {
          productName: job.product?.name || "Product",
          quantity: job.quantity,
          salePrice: job.estimatedCost || 0,
          description: `Defect: ${job.defectiveInventory?.defectReason || "Reported Fault"}${
            job.notes ? ` | Note: ${job.notes}` : ""
          }`,
          productImage: job.product?.images?.[0]?.url,
        },
      ],
      notes: job.notes || "",
    };
    setLastBillData(billData);
    setShowBillModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Successfully Repaired":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 size={12} /> Repaired
          </span>
        );
      case "Partially Repaired":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
            <Clock size={12} /> Partially Repaired
          </span>
        );
      case "Failed":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1">
            <AlertTriangle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
            <Clock size={12} /> In Progress
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ─── Header & Top Tabs ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Wrench size={22} />
            </div>
            Repair Bill & Vendor Dispatch
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Generate official repair invoices / receipts for Customers and vendor dispatch challans for defective stock.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl border">
          <button
            type="button"
            onClick={() => setActiveTab("dispatch")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "dispatch"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send size={14} /> New Repair Challan / Bill
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tracking")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "tracking"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={14} /> Repair Records & Tracking ({totalJobs})
          </button>
        </div>
      </div>

      {/* ─── TAB 1: NEW DISPATCH & CHALLAN GENERATOR ─── */}
      {activeTab === "dispatch" && (
        <form onSubmit={handleDispatchSubmit} className="space-y-6">
          {/* Repair Source Toggle Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 bg-card border rounded-3xl shadow-xs">
            <button
              type="button"
              onClick={() => {
                setRepairSource("customer");
                setSelectedDefectiveId("");
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                repairSource === "customer"
                  ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                  : "border-transparent hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  repairSource === "customer"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <ShoppingBag size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-foreground">
                    1. Customer Product Repair
                  </span>
                  {repairSource === "customer" && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-primary text-primary-foreground">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customer brought their item for repair/service. Generates customer invoice; does NOT alter store inventory.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setRepairSource("defective");
                setSelectedProductId("");
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                repairSource === "defective"
                  ? "bg-amber-500/10 border-amber-500 shadow-xs ring-1 ring-amber-500/30"
                  : "border-transparent hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  repairSource === "defective"
                    ? "bg-amber-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Layers size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-foreground">
                    2. Store Defective Stock Repair
                  </span>
                  {repairSource === "defective" && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-600 text-white">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Our shop defective stock sent to workshop (Viraj, Poonam). Decrements defective stock & restores sellable stock upon receipt.
                </p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Item Selector & Staged Items Table */}
            <div className="lg:col-span-2 space-y-5">
              {/* Product Selector Card */}
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Package size={16} />
                    {repairSource === "customer"
                      ? "Select Customer Product / Device"
                      : "Select Defective Store Inventory"}
                  </h3>
                  {repairSource === "defective" && defectiveItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleStageAllDefective}
                      className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={12} /> Stage All Available Defective ({defectiveItems.length})
                    </button>
                  )}
                </div>

                {/* Customer Repair Mode: Catalog Products Picker */}
                {repairSource === "customer" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Search Product
                        </label>
                        <div className="relative">
                          <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            size={14}
                          />
                          <input
                            type="text"
                            placeholder="Type name / model..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full rounded-xl border bg-background pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Choose Product from Catalog *
                        </label>
                        <select
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                        >
                          <option value="">-- Select Product --</option>
                          {filteredCatalogProducts.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} {p.price ? `(Mkt: Rs. ${p.price.toLocaleString()})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Quantity to Repair *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={selectedQty}
                          onChange={(e) => setSelectedQty(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Estimated Repair Charges / Cost (PKR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedEstCost}
                          onChange={(e) => setSelectedEstCost(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="e.g. 1500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Customer Reported Fault / Defect *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Screen flickering, no power, battery drain, motor winding..."
                          value={selectedDefectReason}
                          onChange={(e) => setSelectedDefectReason(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Special Instructions / Serial # / Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Keep original casing, test before delivery, serial #..."
                          value={selectedItemNote}
                          onChange={(e) => setSelectedItemNote(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={handleStageCustomerItem}
                        variant="primary"
                        className="gap-2 text-xs font-bold cursor-pointer text-white"
                      >
                        <Plus size={14} /> Add Customer Product to Challan
                      </Button>
                    </div>
                  </div>
                )}

                {/* Defective Stock Mode: Defective Inventory Batches */}
                {repairSource === "defective" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Defective Product Batch *
                      </label>
                      <select
                        value={selectedDefectiveId}
                        onChange={(e) => {
                          setSelectedDefectiveId(e.target.value);
                          const d = defectiveItems.find((it) => it._id === e.target.value);
                          if (d && d.defectReason) {
                            setSelectedDefectReason(d.defectReason);
                          }
                        }}
                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                      >
                        <option value="">-- Choose Defective Batch --</option>
                        {defectiveItems.map((def) => {
                          const name = def.product?.name || "Product";
                          return (
                            <option key={def._id} value={def._id}>
                              {name} • {def.availableDefectiveQuantity} avail • Reason: {def.defectReason}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Quantity to Send *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={selectedQty}
                          onChange={(e) => setSelectedQty(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Estimated Repair Cost / Unit (PKR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedEstCost}
                          onChange={(e) => setSelectedEstCost(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Specific Fault / Workshop Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Check capacitor, replace display IC, check coil..."
                          value={selectedItemNote}
                          onChange={(e) => setSelectedItemNote(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={handleStageDefectiveItem}
                        variant="outline"
                        className="gap-2 text-xs font-bold cursor-pointer border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                      >
                        <Plus size={14} /> Add Defective Item To Challan
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Staged Items Table */}
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText size={16} /> 2. Items in This Repair Challan ({stagedItems.length})
                  </h3>
                  {stagedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStagedItems([])}
                      className="text-[11px] text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {stagedItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-2xl border-dashed">
                    <Package size={28} className="mx-auto opacity-30 mb-1.5" />
                    No items added yet. Select a product above and click &quot;Add to Challan&quot;.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                          <th className="p-3">Type</th>
                          <th className="p-3">Product</th>
                          <th className="p-3">Reported Fault</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Est. Unit Rate</th>
                          <th className="p-3 text-right">Subtotal</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {stagedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.source === "customer"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-amber-500/10 text-amber-600"
                                }`}
                              >
                                {item.source === "customer" ? "Customer" : "Store Defective"}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-foreground">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.productImage ? (
                                    <img
                                      src={item.productImage}
                                      alt={item.productName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package size={14} className="text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate max-w-[180px]">{item.productName}</p>
                                  {item.notes && (
                                    <p className="text-[10px] text-muted-foreground italic truncate">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              <span className="px-2 py-0.5 rounded bg-muted font-bold text-[10px]">
                                {item.defectReason}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold font-mono text-sm">
                              {item.quantity}
                            </td>
                            <td className="p-3 text-right font-mono">
                              PKR {item.estimatedCost.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-foreground">
                              PKR {(item.estimatedCost * item.quantity).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveStagedItem(idx)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Parties & Dispatch Summary */}
            <div className="space-y-5">
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <User size={16} /> 3. Challan & Party Details
                </h3>

                {/* Customer Details (Customer Repair) */}
                {repairSource === "customer" && (
                  <div className="space-y-3 pb-3 border-b">
                    <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                      Customer Information:
                    </span>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ahmed Khan, Bilal..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Customer Phone / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +92 300 1234567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Customer Address / City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Clifton, Karachi"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                )}

                {/* Vendor / Workshop Details */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    {repairSource === "customer"
                      ? "Assigned Technician / Workshop (Optional):"
                      : "Repair Vendor / Technician Details:"}
                  </span>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      {repairSource === "customer"
                        ? "Technician / Workshop Name"
                        : "Vendor / Technician Name *"}
                    </label>
                    <input
                      type="text"
                      required={repairSource === "defective"}
                      placeholder="e.g. Viraj, Poonam, Internal Workshop"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />

                    {/* Quick vendor chips */}
                    {vendorsList.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-bold">Recent:</span>
                        {vendorsList.slice(0, 4).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVendorName(v)}
                            className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Workshop Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +92 333 1234567"
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  {repairSource === "defective" && (
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Workshop Address / Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shop #12, Shershah Market"
                        value={vendorAddress}
                        onChange={(e) => setVendorAddress(e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Expected Return / Delivery Date
                    </label>
                    <input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Challan Terms / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Additional terms or instructions..."
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total Units In Challan:</span>
                    <strong className="text-foreground text-sm font-mono">
                      {stagedItems.reduce((acc, it) => acc + it.quantity, 0)} units
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Est. Total Charges:</span>
                    <strong className="text-primary text-base font-black font-mono">
                      PKR{" "}
                      {stagedItems
                        .reduce((acc, it) => acc + it.quantity * it.estimatedCost, 0)
                        .toLocaleString()}
                    </strong>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={dispatching || stagedItems.length === 0}
                    className="w-full gap-2 py-3 font-black text-sm tracking-wide cursor-pointer text-white shadow-lg"
                  >
                    {dispatching ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Printer size={16} />
                    )}
                    {dispatching
                      ? "Generating Challan..."
                      : "Generate Repair Invoice & Dispatch"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ─── TAB 2: DISPATCHED TRACKING & RECORDS ─── */}
      {activeTab === "tracking" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-4 rounded-3xl border shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                className="w-full rounded-xl border bg-background pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Search Challan #, Customer, Vendor, Product..."
                value={searchTracking}
                onChange={(e) => {
                  setSearchTracking(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Source Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">Source:</span>
                <select
                  value={selectedSourceFilter}
                  onChange={(e) => {
                    setSelectedSourceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="All">All Sources</option>
                  <option value="customer">Customer Repairs</option>
                  <option value="defective">Store Defective</option>
                </select>
              </div>

              {/* Vendor Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">Vendor:</span>
                <select
                  value={selectedVendorFilter}
                  onChange={(e) => {
                    setSelectedVendorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="All">All Vendors</option>
                  {vendorsList.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => {
                    setSelectedStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Successfully Repaired">Successfully Repaired</option>
                  <option value="Partially Repaired">Partially Repaired</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={fetchRepairJobs}
                className="p-2 h-9 w-9 cursor-pointer"
                title="Refresh Records"
              >
                <RefreshCw size={15} className={loadingJobs ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-card border rounded-3xl shadow-xs overflow-hidden">
            {loadingJobs && repairJobs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-primary" />
                Loading dispatched repair jobs...
              </div>
            ) : repairJobs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm border-dashed">
                <Wrench size={32} className="mx-auto opacity-30 mb-2" />
                No dispatched repair records found matching the filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="p-3.5">Challan / Inv #</th>
                      <th className="p-3.5">Source</th>
                      <th className="p-3.5">Customer / Vendor</th>
                      <th className="p-3.5">Product & Defect</th>
                      <th className="p-3.5 text-center">Qty Sent</th>
                      <th className="p-3.5 text-center">Repaired / Failed</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Dispatch Date</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {repairJobs.map((job) => {
                      const prodName = job.product?.name || "Product";
                      const isCustomer = job.repairSource === "customer";
                      return (
                        <tr key={job._id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-foreground">
                            {job.repairInvoiceNo || `REP-${job._id.slice(-6).toUpperCase()}`}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCustomer
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {isCustomer ? "Customer Repair" : "Store Defective"}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {isCustomer ? (
                              <div>
                                <div className="font-bold text-foreground">
                                  {job.customerName || "Customer"}
                                </div>
                                {job.customerPhone && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Phone size={10} /> {job.customerPhone}
                                  </div>
                                )}
                                {job.technicianOrVendor && (
                                  <div className="text-[10px] text-primary font-semibold">
                                    Tech: {job.technicianOrVendor}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="font-bold text-foreground">
                                  {job.technicianOrVendor}
                                </div>
                                {job.vendorPhone && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Phone size={10} /> {job.vendorPhone}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-foreground max-w-[180px] truncate">
                              {prodName}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                              Defect: {job.defectiveInventory?.defectReason || job.notes || "Reported Fault"}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-sm">
                            {job.quantity}
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            <span className="text-emerald-600 font-bold">+{job.quantityRepaired || 0}</span> /{" "}
                            <span className="text-red-500 font-bold">-{job.quantityFailed || 0}</span>
                          </td>
                          <td className="p-3.5">{getStatusBadge(job.status)}</td>
                          <td className="p-3.5 text-muted-foreground text-[11px]">
                            {new Date(job.startDate || job.createdAt).toLocaleDateString("en-PK", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            {job.expectedReturnDate && (
                              <div className="text-[10px] text-amber-600 font-bold">
                                Return by: {new Date(job.expectedReturnDate).toLocaleDateString("en-PK", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={reprintingChallanNo === job.repairInvoiceNo}
                                onClick={() => handleReprintJob(job)}
                                className="h-7 text-[11px] gap-1 px-2.5 font-bold cursor-pointer"
                                title="Print / Download Full Challan"
                              >
                                {reprintingChallanNo === job.repairInvoiceNo ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Printer size={12} />
                                )}
                                Print Challan
                              </Button>

                              {job.status === "In Progress" && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleOpenCompleteModal(job)}
                                  className="h-7 text-[11px] gap-1 px-2.5 font-bold cursor-pointer text-white"
                                  title={isCustomer ? "Hand over to customer" : "Receive repaired stock"}
                                >
                                  <CheckCircle2 size={12} /> {isCustomer ? "Complete" : "Receive Stock"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t text-xs">
                <span className="text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalJobs} records)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: RECEIVE REPAIRED STOCK / COMPLETE REPAIR ─── */}
      {completeModalOpen && activeJobToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {activeJobToComplete.repairSource === "customer"
                      ? "Complete Customer Repair"
                      : "Receive Repaired Stock"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeJobToComplete.repairSource === "customer" ? "Customer: " : "Vendor: "}
                    <strong className="text-foreground">
                      {activeJobToComplete.repairSource === "customer"
                        ? activeJobToComplete.customerName || "Customer"
                        : activeJobToComplete.technicianOrVendor}
                    </strong>{" "}
                    (Total {activeJobToComplete.quantity} units)
                  </p>
                </div>
              </div>
            </div>

            {/* Informational Banner */}
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                activeJobToComplete.repairSource === "customer"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              <Info size={16} className="shrink-0 mt-0.5" />
              <div>
                {activeJobToComplete.repairSource === "customer" ? (
                  <span>
                    <strong>Customer Repair Flow:</strong> Successfully repaired items are returned to the customer. Warehouse stock will <strong>not</strong> be increased.
                  </span>
                ) : (
                  <span>
                    <strong>Store Defective Flow:</strong> Successfully repaired items will be added back to <strong>Sellable Store Stock</strong>. Failed items will return to Defective Inventory.
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitComplete} className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-2xl text-xs space-y-1">
                <p>
                  <strong>Product:</strong> {activeJobToComplete.product?.name || "Product"}
                </p>
                <p>
                  <strong>Challan #:</strong> {activeJobToComplete.repairInvoiceNo}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-emerald-600 block mb-1">
                    Successfully Repaired *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeJobToComplete.quantity}
                    value={successQty}
                    onChange={(e) => setSuccessQty(e.target.value)}
                    className="w-full rounded-xl border border-emerald-500/30 bg-background px-3 py-2 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {activeJobToComplete.repairSource === "customer"
                      ? "Ready for customer pickup"
                      : "Will return to sellable stock"}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-red-600 block mb-1">
                    Failed / Unrepairable *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeJobToComplete.quantity}
                    value={failQty}
                    onChange={(e) => setFailQty(e.target.value)}
                    className="w-full rounded-xl border border-red-500/30 bg-background px-3 py-2 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {activeJobToComplete.repairSource === "customer"
                      ? "Returned unrepairable"
                      : "Will return to defective stock"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Actual Cost / Repair Charges Paid (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Completion Notes / Outcome
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Parts replaced, tested OK under load, customer notified..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompleteModalOpen(false)}
                  className="text-xs font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={completing}
                  className="text-xs font-bold gap-1 text-white cursor-pointer"
                >
                  {completing && <RefreshCw size={14} className="animate-spin" />}
                  {completing ? "Saving..." : "Confirm & Complete"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: PRINTABLE REPAIR BILL / CHALLAN MODAL ─── */}
      {showBillModal && lastBillData && (
        <BillModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          billData={lastBillData}
        />
      )}
    </div>
  );
};

export default RepairBillContent;
