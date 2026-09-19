"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Inbox,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Trash2,
  SlidersHorizontal,
  X,
  FileText,
  ShieldCheck,
} from "lucide-react";
import Button from "@/components/ui/Button";
import TooltipCell from "@/components/ui/TooltipCell";
import toast from "@/utils/toast";

const DEFECT_REASONS = [
  "Damaged",
  "Broken",
  "Missing Parts",
  "Cosmetic Damage",
  "Manufacturing Defect",
  "Packaging Damage",
  "Not Working",
  "Wrong Item",
  "Other",
];

export const StockReceivingContent = ({ basePath = "/admin" }: { basePath?: string }) => {
  const isBarcodeEnabled = process.env.NEXT_PUBLIC_ENABLE_BARCODE === "true";

  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalReceived: 0,
    totalPending: 0,
    totalGood: 0,
    totalDefective: 0,
  });

  // New Receiving Modal state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [receivingRef, setReceivingRef] = useState("");
  const [receivingNotes, setReceivingNotes] = useState("");
  const [receivingDate, setReceivingDate] = useState("");
  const [receivingItems, setReceivingItems] = useState<
    { productId: string; product: any; quantity: number; unitCost: number }[]
  >([]);
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // Product selector inside New Receiving Modal
  const [productSearch, setProductSearch] = useState("");
  const [foundProducts, setFoundProducts] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Active Shipment Inspection Modal state
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [receiptHistory, setReceiptHistory] = useState<any[]>([]);
  const [loadingActiveReceipt, setLoadingActiveReceipt] = useState(false);

  // Mark Good Modal state
  const [markGoodModalOpen, setMarkGoodModalOpen] = useState(false);
  const [selectedItemForGood, setSelectedItemForGood] = useState<any>(null);
  const [goodQty, setGoodQty] = useState("1");
  const [goodNotes, setGoodNotes] = useState("");
  const [submittingGood, setSubmittingGood] = useState(false);

  // Mark Defective Modal state
  const [markDefectiveModalOpen, setMarkDefectiveModalOpen] = useState(false);
  const [selectedItemForDefective, setSelectedItemForDefective] = useState<any>(null);
  const [defectiveQty, setDefectiveQty] = useState("1");
  const [defectReason, setDefectReason] = useState("Damaged");
  const [defectDesc, setDefectDesc] = useState("");
  const [submittingDefective, setSubmittingDefective] = useState(false);

  // Fetch receipts list
  const fetchReceipts = useCallback(
    async (pageToFetch: number, showIndicator = true) => {
      if (showIndicator) setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", pageToFetch.toString());
        params.append("limit", "10");
        if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);
        if (search.trim()) params.append("search", search.trim());

        const res = await fetch(`/api/inventory/receipts?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setReceipts(data.receipts || []);
          setTotalPages(data.totalPages || 1);
          setTotalReceipts(data.totalReceipts || 0);
          if (data.summary) setSummary(data.summary);
        }
      } catch (err) {
        console.error("Error fetching receipts:", err);
      } finally {
        if (showIndicator) setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, search]
  );

  useEffect(() => {
    fetchReceipts(currentPage);
  }, [currentPage, fetchReceipts]);

  const handleToggleSelectAll = () => {
    if (selectedReceiptIds.length === receipts.length && receipts.length > 0) {
      setSelectedReceiptIds([]);
    } else {
      setSelectedReceiptIds(receipts.map((r) => r._id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedReceiptIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    const idsToDelete = receiptToDelete ? [receiptToDelete] : selectedReceiptIds;
    if (idsToDelete.length === 0) return;

    setDeletingBulk(true);
    try {
      const res = await fetch("/api/inventory/receipts/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Deleted ${idsToDelete.length} shipment(s).`);
        setSelectedReceiptIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
        setDeleteConfirmOpen(false);
        setReceiptToDelete(null);
        fetchReceipts(currentPage, false);
      } else {
        toast.error(data.error || "Failed to delete shipments");
      }
    } catch {
      toast.error("Network error deleting shipments");
    } finally {
      setDeletingBulk(false);
    }
  };

  // Product Search inside New Shipment Modal
  useEffect(() => {
    if (!productSearch.trim()) {
      setFoundProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch.trim())}&limit=8`);
        const data = await res.json();
        if (data.success) {
          setFoundProducts(data.products || []);
        }
      } catch (err) {
        console.error("Error searching products:", err);
      } finally {
        setSearchingProducts(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleOpenNewModal = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setReceivingRef(`REC-${dateStr}-${randomSuffix}`);
    setReceivingDate(now.toISOString().slice(0, 10));
    setReceivingNotes("");
    setReceivingItems([]);
    setProductSearch("");
    setFoundProducts([]);
    setNewModalOpen(true);
  };

  const handleAddProductToReceiving = (product: any) => {
    // If already in list, increase quantity
    const existing = receivingItems.find((i) => i.productId === product._id);
    if (existing) {
      setReceivingItems((prev) =>
        prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setReceivingItems((prev) => [
        ...prev,
        {
          productId: product._id,
          product,
          quantity: 1,
          unitCost: product.price ? Math.round(product.price * 0.7) : 0,
        },
      ]);
    }
    setProductSearch("");
    setFoundProducts([]);
  };

  const handleRemoveReceivingItem = (index: number) => {
    setReceivingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receivingItems.length === 0) {
      toast.error("Please add at least one product to the receiving shipment.");
      return;
    }

    // Validate quantities
    for (const item of receivingItems) {
      if (item.quantity <= 0) {
        toast.error(`Quantity for ${item.product.name} must be greater than 0.`);
        return;
      }
    }

    setSubmittingReceive(true);
    try {
      const res = await fetch("/api/inventory/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNumber: receivingRef.trim(),
          receivedAt: receivingDate,
          notes: receivingNotes.trim(),
          items: receivingItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Shipment ${receivingRef} received into Pending Inspection!`);
        setNewModalOpen(false);
        fetchReceipts(1);
      } else {
        toast.error(data.error || "Failed to receive stock");
      }
    } catch {
      toast.error("Network error submitting stock receipt");
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Open Inspection Modal for a shipment
  const handleOpenInspection = async (receiptId: string) => {
    setInspectModalOpen(true);
    setLoadingActiveReceipt(true);
    try {
      const res = await fetch(`/api/inventory/receipts/${receiptId}`);
      const data = await res.json();
      if (data.success) {
        setActiveReceipt(data.receipt);
        setReceiptHistory(data.history || []);
      } else {
        toast.error(data.error || "Failed to load receipt details");
      }
    } catch {
      toast.error("Network error loading receipt details");
    } finally {
      setLoadingActiveReceipt(false);
    }
  };

  // Confirm Mark Good
  const handleConfirmMarkGood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReceipt || !selectedItemForGood) return;

    const qty = Number(goodQty);
    if (qty <= 0 || qty > selectedItemForGood.qtyPending) {
      toast.error(`Quantity must be between 1 and ${selectedItemForGood.qtyPending}`);
      return;
    }

    setSubmittingGood(true);
    try {
      const res = await fetch(
        `/api/inventory/receipts/${activeReceipt._id}/items/${selectedItemForGood._id}/mark-good`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity: qty,
            notes: goodNotes.trim(),
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Marked ${qty} units as Good! Sellable stock updated.`);
        setMarkGoodModalOpen(false);
        setGoodNotes("");
        // Reload active receipt details
        handleOpenInspection(activeReceipt._id);
        fetchReceipts(currentPage, false);
      } else {
        toast.error(data.error || "Failed to mark item as good");
      }
    } catch {
      toast.error("Network error marking good");
    } finally {
      setSubmittingGood(false);
    }
  };

  // Confirm Mark Defective
  const handleConfirmMarkDefective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReceipt || !selectedItemForDefective) return;

    const qty = Number(defectiveQty);
    if (qty <= 0 || qty > selectedItemForDefective.qtyPending) {
      toast.error(`Quantity must be between 1 and ${selectedItemForDefective.qtyPending}`);
      return;
    }

    setSubmittingDefective(true);
    try {
      const res = await fetch(
        `/api/inventory/receipts/${activeReceipt._id}/items/${selectedItemForDefective._id}/mark-defective`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity: qty,
            defectReason,
            description: defectDesc.trim(),
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Marked ${qty} units as Defective (${defectReason}). Added to Defective Inventory.`);
        setMarkDefectiveModalOpen(false);
        setDefectDesc("");
        // Reload active receipt details
        handleOpenInspection(activeReceipt._id);
        fetchReceipts(currentPage, false);
      } else {
        toast.error(data.error || "Failed to mark item as defective");
      }
    } catch {
      toast.error("Network error marking defective");
    } finally {
      setSubmittingDefective(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Inspection Completed") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    }
    if (status === "Partially Inspected") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
          <Clock size={12} /> Partially Inspected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
        <Clock size={12} /> Pending Inspection
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={`${basePath}/inventory`}
            className="p-2 rounded-xl border hover:bg-muted transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shadow-sm">
            <Inbox size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Stock Receiving & Inspection</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Receive shipments into Pending Inspection and classify into Good or Defective stock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchReceipts(currentPage, false);
            }}
            disabled={refreshing || loading}
            className="gap-2"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>

          <Button size="sm" onClick={handleOpenNewModal} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus size={15} /> Receive New Stock
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border bg-card shadow-sm border-blue-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Inbox size={13} /> Total Physical Received
          </span>
          <div className="text-2xl font-black text-foreground mt-2">
            {loading ? "..." : summary.totalReceived.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Across all shipments</p>
        </div>

        <div className="p-4 rounded-2xl border bg-card shadow-sm border-amber-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Clock size={13} /> Pending Inspection
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {loading ? "..." : summary.totalPending.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting QA verification</p>
        </div>

        <div className="p-4 rounded-2xl border bg-card shadow-sm border-emerald-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Inspected Good
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {loading ? "..." : summary.totalGood.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Moved to sellable stock</p>
        </div>

        <div className="p-4 rounded-2xl border bg-card shadow-sm border-red-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Classified Defective
          </span>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-2">
            {loading ? "..." : summary.totalDefective.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Moved to defective inventory</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col gap-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="Search by Reference # or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1">
              <SlidersHorizontal size={13} /> Status:
            </span>
            {["All", "Pending Inspection", "Partially Inspected", "Inspection Completed"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Selection & Select All Toolbar */}
        {receipts.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border flex-wrap">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="selectAllReceipts"
                checked={receipts.length > 0 && selectedReceiptIds.length === receipts.length}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="selectAllReceipts" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Select All ({receipts.length} on page)
              </label>
            </div>

            {selectedReceiptIds.length > 0 && (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                  {selectedReceiptIds.length} Selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedReceiptIds([])}
                  className="h-8 text-xs font-bold"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReceiptToDelete(null);
                    setDeleteConfirmOpen(true);
                  }}
                  className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-xs"
                >
                  <Trash2 size={13} /> Delete Selected ({selectedReceiptIds.length})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Shipments List */}
        {loading && receipts.length === 0 ? (
          <div className="flex flex-col gap-3 py-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm border rounded-2xl border-dashed">
            <Inbox size={36} className="mx-auto opacity-30 mb-2" />
            No stock receiving shipments found. Click &quot;Receive New Stock&quot; to create one.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {receipts.map((r) => {
              const totalQtyReceived = r.items?.reduce((s: number, i: any) => s + (i.qtyReceived || 0), 0) || 0;
              const totalPending = r.items?.reduce((s: number, i: any) => s + (i.qtyPending || 0), 0) || 0;
              const totalGood = r.items?.reduce((s: number, i: any) => s + (i.qtyGood || 0), 0) || 0;
              const totalDefective = r.items?.reduce((s: number, i: any) => s + (i.qtyDefective || 0), 0) || 0;
              const inspectedPercent =
                totalQtyReceived > 0
                  ? Math.round(((totalGood + totalDefective) / totalQtyReceived) * 100)
                  : 0;

              return (
                <div
                  key={r._id}
                  className={`border rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                    selectedReceiptIds.includes(r._id)
                      ? "bg-amber-500/5 border-amber-500/40"
                      : "bg-background/50 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedReceiptIds.includes(r._id)}
                      onChange={() => handleToggleSelectOne(r._id)}
                      className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer mt-3"
                    />
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-black text-sm text-foreground">
                          {r.receiptNumber}
                        </span>
                        {getStatusBadge(r.status)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.receivedAt || r.createdAt).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                        <span>
                          Items: <strong className="text-foreground">{r.items?.length || 0} products</strong>
                        </span>
                        <span>
                          Total Qty: <strong className="text-foreground">{totalQtyReceived} units</strong>
                        </span>
                        {r.receivedBy && <span>By: {r.receivedBy.name}</span>}
                        {r.notes && (
                          <span className="italic max-w-[200px]">
                            <TooltipCell
                              text={`Note: "${r.notes}"`}
                              tooltipLines={[r.notes]}
                              tooltipTitle="Receiving Notes"
                              maxChars={26}
                            />
                          </span>
                        )}
                      </div>

                      {/* Mini progress bar */}
                      <div className="flex items-center gap-2 mt-2 max-w-sm">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                          <div
                            style={{ width: `${(totalGood / (totalQtyReceived || 1)) * 100}%` }}
                            className="bg-emerald-500 h-full transition-all"
                            title={`Good: ${totalGood}`}
                          />
                          <div
                            style={{ width: `${(totalDefective / (totalQtyReceived || 1)) * 100}%` }}
                            className="bg-red-500 h-full transition-all"
                            title={`Defective: ${totalDefective}`}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                          {inspectedPercent}% QA Done
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                        +{totalGood} Good
                      </span>
                      <span className="text-red-600 font-bold bg-red-500/10 px-2 py-0.5 rounded">
                        {totalDefective} Defective
                      </span>
                      {totalPending > 0 && (
                        <span className="text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                          {totalPending} Pending
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleOpenInspection(r._id)}
                      className="gap-1 text-xs"
                      variant={totalPending > 0 ? "primary" : "outline"}
                    >
                      {totalPending > 0 ? "Inspect Quality" : "View Inspection"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReceiptToDelete(r._id);
                        setDeleteConfirmOpen(true);
                      }}
                      className="p-2 h-8 w-8 text-red-600 hover:bg-red-500/10"
                      title="Delete shipment"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalReceipts} shipments)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="gap-1 h-8 px-2 text-xs"
              >
                <ChevronLeft size={13} /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="gap-1 h-8 px-2 text-xs"
              >
                Next <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ─── MODAL 1: NEW STOCK RECEIVING ─── */}
      {/* ========================================================= */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Inbox size={18} />
                </div>
                <div>
                  <h3 className="font-black text-lg">Receive New Physical Stock</h3>
                  <p className="text-xs text-muted-foreground">
                    Incoming items will enter &quot;Pending Inspection&quot; before reaching sellable stock.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReceiving} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                  <span>Reference # *</span>
                  <input
                    type="text"
                    required
                    value={receivingRef}
                    onChange={(e) => setReceivingRef(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                  <span>Received Date *</span>
                  <input
                    type="date"
                    required
                    value={receivingDate}
                    onChange={(e) => setReceivingDate(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>

              {/* Product Selector from Existing Master Catalog */}
              <div className="flex flex-col gap-1.5 relative">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Select Products From Catalog *
                </span>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={
                      isBarcodeEnabled
                        ? "Search product by name or barcode to add..."
                        : "Search product by name to add..."
                    }
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full rounded-xl border bg-background pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {searchingProducts && (
                    <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {foundProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border rounded-2xl shadow-xl max-h-52 overflow-y-auto divide-y">
                    {foundProducts.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => handleAddProductToReceiving(p)}
                        className="w-full p-2.5 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={14} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs max-w-[200px]">
                            <TooltipCell
                              text={p.name}
                              tooltipTitle="Product Name"
                              maxChars={24}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Current Sellable: {p.stock} units {isBarcodeEnabled && p.barcode ? `• SKU: ${p.barcode}` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          + Add Row
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Added Products Table */}
              <div className="border rounded-2xl overflow-hidden bg-background">
                <div className="p-3 bg-muted/40 border-b flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Items to Receive ({receivingItems.length})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Total Qty: {receivingItems.reduce((s, i) => s + (i.quantity || 0), 0)}
                  </span>
                </div>

                {receivingItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border-dashed">
                    No products added yet. Use the search above to pick products.
                  </div>
                ) : (
                  <div className="divide-y max-h-56 overflow-y-auto">
                    {receivingItems.map((item, idx) => (
                      <div key={item.productId} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                            {item.product.images?.[0]?.url ? (
                              <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={14} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs max-w-[200px]">
                              <TooltipCell
                                text={item.product.name}
                                tooltipTitle="Product Name"
                                maxChars={24}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Sellable on hand: {item.product.stock}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <label className="flex flex-col gap-0.5 text-[10px] font-bold text-muted-foreground">
                            <span>Qty Received</span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              required
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setReceivingItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                                );
                              }}
                              className="w-20 rounded-lg border bg-card px-2 py-1 text-center font-bold text-xs"
                            />
                          </label>

                          <label className="flex flex-col gap-0.5 text-[10px] font-bold text-muted-foreground">
                            <span>Unit Cost (PKR)</span>
                            <input
                              type="number"
                              min={0}
                              value={item.unitCost}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setReceivingItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, unitCost: val } : it))
                                );
                              }}
                              className="w-24 rounded-lg border bg-card px-2 py-1 text-center font-bold text-xs"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveReceivingItem(idx)}
                            className="p-1 text-muted-foreground hover:text-red-500 rounded mt-3"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Notes / Supplier Bill Memo (Optional)</span>
                <textarea
                  rows={2}
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="e.g. Received from Karachi supplier batch 104..."
                  className="w-full rounded-xl border bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewModalOpen(false)}
                  disabled={submittingReceive}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingReceive || receivingItems.length === 0}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {submittingReceive ? <RefreshCw size={14} className="animate-spin" /> : <Inbox size={14} />}
                  Confirm Stock Receiving
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── MODAL 2: SHIPMENT INSPECTION & QA ─── */}
      {/* ========================================================= */}
      {inspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg">
                    Quality Inspection: {activeReceipt?.receiptNumber}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Inspect received products independently. Partial quantities fully supported.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {loadingActiveReceipt ? (
              <div className="py-16 text-center text-muted-foreground">
                <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                Loading shipment details...
              </div>
            ) : !activeReceipt ? (
              <div className="py-10 text-center text-muted-foreground">Shipment details not found.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Shipment Meta summary */}
                <div className="p-3.5 rounded-xl bg-muted/40 border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Status</span>
                    {getStatusBadge(activeReceipt.status)}
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Date Received</span>
                    <span className="font-bold">
                      {new Date(activeReceipt.receivedAt || activeReceipt.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Received By</span>
                    <span className="font-bold">{activeReceipt.receivedBy?.name || "Admin"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Items</span>
                    <span className="font-bold">{activeReceipt.items?.length || 0} product lines</span>
                  </div>
                </div>

                {/* Items QA List */}
                <div className="flex flex-col gap-3">
                  <h4 className="font-black text-sm uppercase tracking-wider text-muted-foreground">
                    Product Rows for Inspection
                  </h4>

                  {activeReceipt.items?.map((it: any) => {
                    const prod = it.product || {};
                    const isFullyInspected = it.qtyPending === 0;

                    return (
                      <div
                        key={it._id}
                        className={`border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                          isFullyInspected ? "bg-muted/20 border-emerald-500/30" : "bg-card shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                              {prod.images?.[0]?.url ? (
                                <img src={prod.images[0].url} alt={prod.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={20} className="text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-foreground max-w-[240px]">
                                <TooltipCell
                                  text={prod.name}
                                  tooltipTitle="Product Name"
                                  maxChars={28}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Current Sellable: {prod.stock} {prod.barcode ? `• SKU: ${prod.barcode}` : ""}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              isFullyInspected
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {isFullyInspected ? "Inspection Completed" : `${it.qtyPending} Pending Inspection`}
                          </span>
                        </div>

                        {/* Breakdown Pills */}
                        <div className="grid grid-cols-4 gap-2 bg-muted/40 p-2.5 rounded-xl text-center text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground block">Received</span>
                            <span className="font-black text-sm text-foreground">{it.qtyReceived}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">Pending</span>
                            <span className="font-black text-sm text-amber-600 dark:text-amber-400">{it.qtyPending}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">Good</span>
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">+{it.qtyGood}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block">Defective</span>
                            <span className="font-black text-sm text-red-600 dark:text-red-400">{it.qtyDefective}</span>
                          </div>
                        </div>

                        {/* Actions for this row if pending > 0 */}
                        {it.qtyPending > 0 ? (
                          <div className="flex items-center justify-end gap-2 pt-1 border-t">
                            <Button
                              size="sm"
                              className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() => {
                                setSelectedItemForGood(it);
                                setGoodQty(it.qtyPending.toString());
                                setGoodNotes("");
                                setMarkGoodModalOpen(true);
                              }}
                            >
                              <CheckCircle2 size={13} /> Mark Good
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-bold"
                              onClick={() => {
                                setSelectedItemForDefective(it);
                                setDefectiveQty(it.qtyPending.toString());
                                setDefectReason("Damaged");
                                setDefectDesc("");
                                setMarkDefectiveModalOpen(true);
                              }}
                            >
                              <AlertTriangle size={13} /> Mark Defective
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-600 font-bold pt-1">
                            <CheckCircle2 size={14} /> All {it.qtyReceived} units verified & classified.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Receipt Movement Trail */}
                {receiptHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                    <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Inspection Log Trail
                    </h5>
                    <div className="divide-y border rounded-xl bg-background max-h-40 overflow-y-auto">
                      {receiptHistory.map((h) => (
                        <div key={h._id} className="p-2.5 text-xs flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-foreground">{h.description}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(h.createdAt).toLocaleTimeString()} • By: {h.performedBy?.name || "System"}
                            </p>
                          </div>
                          <span
                            className={`font-mono font-bold text-xs ${
                              h.change > 0 ? "text-emerald-600" : "text-muted-foreground"
                            }`}
                          >
                            {h.change > 0 ? `+${h.change}` : "0"} sellable
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── MODAL 3: MARK GOOD CONFIRMATION ─── */}
      {/* ========================================================= */}
      {markGoodModalOpen && selectedItemForGood && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b pb-3 text-emerald-600">
              <CheckCircle2 size={20} />
              <h4 className="font-black text-base text-foreground">Mark Product as Good</h4>
            </div>

            <p className="text-xs text-muted-foreground">
              Accepted quantity will immediately increase active sellable stock for{" "}
              <strong className="text-foreground">{selectedItemForGood.product?.name}</strong>.
            </p>

            <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between">
              <span>Remaining Pending:</span>
              <strong className="text-amber-600 font-bold">{selectedItemForGood.qtyPending} units</strong>
            </div>

            <form onSubmit={handleConfirmMarkGood} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Quantity to Mark Good *</span>
                <input
                  type="number"
                  min={1}
                  max={selectedItemForGood.qtyPending}
                  required
                  value={goodQty}
                  onChange={(e) => setGoodQty(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-base font-black text-center outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>

              {/* Live Preview */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-center font-bold text-emerald-700 dark:text-emerald-400">
                Sellable stock will increase by: +{goodQty || 0}
              </div>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Inspection Notes (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Batch verified, sealed package intact"
                  value={goodNotes}
                  onChange={(e) => setGoodNotes(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMarkGoodModalOpen(false)}
                  disabled={submittingGood}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingGood}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {submittingGood ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Confirm Good Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── MODAL 4: MARK DEFECTIVE CONFIRMATION ─── */}
      {/* ========================================================= */}
      {markDefectiveModalOpen && selectedItemForDefective && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b pb-3 text-red-600">
              <AlertTriangle size={20} />
              <h4 className="font-black text-base text-foreground">Mark Product as Defective</h4>
            </div>

            <p className="text-xs text-muted-foreground">
              Items will enter <strong className="text-foreground">Defective Inventory</strong>. Normal sellable stock will NOT increase.
            </p>

            <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between">
              <span>Remaining Pending:</span>
              <strong className="text-amber-600 font-bold">{selectedItemForDefective.qtyPending} units</strong>
            </div>

            <form onSubmit={handleConfirmMarkDefective} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Quantity to Mark Defective *</span>
                <input
                  type="number"
                  min={1}
                  max={selectedItemForDefective.qtyPending}
                  required
                  value={defectiveQty}
                  onChange={(e) => setDefectiveQty(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-base font-black text-center outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Defect Reason *</span>
                <select
                  value={defectReason}
                  onChange={(e) => setDefectReason(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  {DEFECT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Description / Details *</span>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe the defect (e.g. crack on side casing, power switch unresponsive)..."
                  value={defectDesc}
                  onChange={(e) => setDefectDesc(e.target.value)}
                  className="w-full rounded-xl border bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMarkDefectiveModalOpen(false)}
                  disabled={submittingDefective}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingDefective}
                  className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  {submittingDefective ? <RefreshCw size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  Confirm Defective Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b pb-3 text-red-600">
              <Trash2 size={20} />
              <h4 className="font-black text-base text-foreground">Confirm Deletion</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {receiptToDelete
                ? "Are you sure you want to permanently delete this shipment receipt? Any uninspected pending quantities in this shipment will be removed."
                : `Are you sure you want to permanently delete the ${selectedReceiptIds.length} selected shipment receipt(s)? Any uninspected pending quantities will be removed.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setReceiptToDelete(null);
                }}
                disabled={deletingBulk}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deletingBulk}
                onClick={handleBulkDelete}
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {deletingBulk ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete {receiptToDelete ? "Shipment" : `(${selectedReceiptIds.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminStockReceivingPage = () => {
  return <StockReceivingContent basePath="/admin" />;
};

export default AdminStockReceivingPage;
