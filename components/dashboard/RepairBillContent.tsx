"use client";
import React, { useEffect, useState, useCallback } from "react";
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
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

interface RepairBillContentProps {
  basePath?: string; // "/admin" or "/owner"
}

export const RepairBillContent: React.FC<RepairBillContentProps> = ({
  basePath = "/admin",
}) => {
  const [activeTab, setActiveTab] = useState<"dispatch" | "tracking">("dispatch");

  // ── Dispatch Form State ──
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatching, setDispatching] = useState(false);

  // Available Defective Stock for selection
  const [defectiveItems, setDefectiveItems] = useState<any[]>([]);
  const [loadingDefective, setLoadingDefective] = useState(false);
  const [selectedDefectiveId, setSelectedDefectiveId] = useState("");
  const [selectedQty, setSelectedQty] = useState("1");
  const [selectedEstCost, setSelectedEstCost] = useState("0");
  const [selectedItemNote, setSelectedItemNote] = useState("");

  // Staged items for current dispatch challan
  const [stagedItems, setStagedItems] = useState<
    {
      defectiveId: string;
      productName: string;
      productImage?: string;
      defectReason: string;
      availableQty: number;
      quantity: number;
      estimatedCost: number;
      notes: string;
    }[]
  >([]);

  // ── Bill Modal State ──
  const [showBillModal, setShowBillModal] = useState(false);
  const [lastBillData, setLastBillData] = useState<any>(null);

  // ── Tracking State ──
  const [repairJobs, setRepairJobs] = useState<any[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [vendorsList, setVendorsList] = useState<string[]>([]);
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
  }, [currentPage, selectedVendorFilter, selectedStatusFilter, searchTracking]);

  useEffect(() => {
    fetchDefectiveInventory();
  }, [fetchDefectiveInventory]);

  useEffect(() => {
    fetchRepairJobs();
  }, [fetchRepairJobs]);

  // Handle stage item for dispatch
  const handleStageItem = () => {
    if (!selectedDefectiveId) {
      toast.error("Please select a defective product.");
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
      toast.error(`Only ${def.availableDefectiveQuantity} units available.`);
      return;
    }

    const estCost = parseFloat(selectedEstCost) || 0;

    // Check if already staged
    const existingIdx = stagedItems.findIndex((it) => it.defectiveId === selectedDefectiveId);
    if (existingIdx >= 0) {
      const updated = [...stagedItems];
      updated[existingIdx].quantity += qty;
      updated[existingIdx].estimatedCost = estCost;
      updated[existingIdx].notes = selectedItemNote || updated[existingIdx].notes;
      setStagedItems(updated);
    } else {
      setStagedItems((prev) => [
        ...prev,
        {
          defectiveId: def._id,
          productName: def.product?.name || "Product",
          productImage: def.product?.images?.[0]?.url,
          defectReason: def.defectReason,
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
  };

  const handleRemoveStagedItem = (index: number) => {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit dispatch to repair vendor
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      toast.error("Please enter a Vendor / Technician name (e.g. Viraj, Poonam).");
      return;
    }
    if (stagedItems.length === 0) {
      toast.error("Please add at least one item to dispatch.");
      return;
    }

    setDispatching(true);
    try {
      const res = await fetch("/api/inventory/repairs/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName: vendorName.trim(),
          vendorPhone: vendorPhone.trim(),
          vendorAddress: vendorAddress.trim(),
          expectedReturnDate: expectedReturnDate || undefined,
          notes: dispatchNotes.trim(),
          items: stagedItems.map((it) => ({
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
        toast.success(data.message || `Dispatched to ${vendorName.trim()} successfully!`);

        // Automatically open printable BillModal
        if (data.billData) {
          setLastBillData(data.billData);
          setShowBillModal(true);
        }

        // Reset form
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
      toast.error("Quantities must be positive integers.");
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
        toast.success(data.message || "Repair completed successfully! Stock updated.");
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

  // Reprint / view existing challan
  const handleReprintJob = (job: any) => {
    const billData = {
      invoiceNo: job.repairInvoiceNo || `REP-${job._id.slice(-6).toUpperCase()}`,
      date: new Date(job.startDate || job.createdAt).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      customerName: job.technicianOrVendor || "Repair Vendor",
      customerPhone: job.vendorPhone || "",
      customerAddress: job.vendorAddress || "",
      type: "Repair",
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
            <CheckCircle2 size={12} /> Successfully Repaired
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
            <AlertTriangle size={12} /> Repair Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
            <Clock size={12} /> With Vendor (In Progress)
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
            Generate official Repair Invoices / Challans for repair technicians (Viraj, Poonam, etc.) & track repair statuses.
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
            <Send size={14} /> New Dispatch Challan
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
            <FileText size={14} /> Dispatched Tracking ({totalJobs})
          </button>
        </div>
      </div>

      {/* ─── TAB 1: NEW DISPATCH & CHALLAN GENERATOR ─── */}
      {activeTab === "dispatch" && (
        <form onSubmit={handleDispatchSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Items & Staging */}
            <div className="lg:col-span-2 space-y-5">
              {/* Product Picker */}
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Package size={16} /> 1. Select Defective Stock To Repair
                  </h3>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {defectiveItems.length} defective batches available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Defective Product *
                    </label>
                    <select
                      value={selectedDefectiveId}
                      onChange={(e) => setSelectedDefectiveId(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="">-- Choose Defective Item --</option>
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

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Quantity to Send *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
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
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Specific Fault / Repair Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Broken capacitor, check display IC, replace casing..."
                      value={selectedItemNote}
                      onChange={(e) => setSelectedItemNote(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleStageItem}
                    variant="outline"
                    className="gap-2 text-xs font-bold cursor-pointer"
                  >
                    <Plus size={14} /> Add Item To Challan
                  </Button>
                </div>
              </div>

              {/* Staged Items Table */}
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText size={16} /> 2. Items in This Challan ({stagedItems.length})
                  </h3>
                </div>

                {stagedItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-2xl border-dashed">
                    <Package size={28} className="mx-auto opacity-30 mb-1.5" />
                    No items added yet. Select a product above and click &quot;Add Item To Challan&quot;.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                          <th className="p-3">Product</th>
                          <th className="p-3">Defect Reason</th>
                          <th className="p-3 text-center">Qty to Send</th>
                          <th className="p-3 text-right">Est. Unit Cost</th>
                          <th className="p-3 text-right">Subtotal</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {stagedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-bold text-foreground">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.productImage ? (
                                    <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package size={14} className="text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate max-w-[200px]">{item.productName}</p>
                                  {item.notes && <p className="text-[10px] text-muted-foreground italic truncate">{item.notes}</p>}
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

            {/* Right 1 Col: Vendor Information & Dispatch Summary */}
            <div className="space-y-5">
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <User size={16} /> 3. Repair Vendor Details
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Vendor / Technician Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Viraj, Poonam, Delta Repair"
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
                      Vendor Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +92 300 1234567"
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

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

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Expected Return Date
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
                      Challan Notes / Terms
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Additional terms or instructions for the technician..."
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total Pieces Dispatched:</span>
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
                placeholder="Search by Challan #, Vendor, Product..."
                value={searchTracking}
                onChange={(e) => {
                  setSearchTracking(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
                  <option value="In Progress">In Progress (With Vendor)</option>
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
                      <th className="p-3.5">Vendor / Workshop</th>
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
                      return (
                        <tr key={job._id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-foreground">
                            {job.repairInvoiceNo || `REP-${job._id.slice(-6).toUpperCase()}`}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-foreground">{job.technicianOrVendor}</div>
                            {job.vendorPhone && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Phone size={10} /> {job.vendorPhone}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-foreground max-w-[200px] truncate">
                              {prodName}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                              Defect: {job.defectiveInventory?.defectReason || "Reported Fault"}
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
                                onClick={() => handleReprintJob(job)}
                                className="h-7 text-[11px] gap-1 px-2.5 font-bold cursor-pointer"
                                title="Print / Download Challan"
                              >
                                <Printer size={12} /> Print Challan
                              </Button>

                              {job.status === "In Progress" && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleOpenCompleteModal(job)}
                                  className="h-7 text-[11px] gap-1 px-2.5 font-bold cursor-pointer text-white"
                                  title="Receive repaired stock"
                                >
                                  <CheckCircle2 size={12} /> Receive Stock
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

      {/* ─── MODAL 1: RECEIVE REPAIRED STOCK ─── */}
      {completeModalOpen && activeJobToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="font-black text-base">Receive Repaired Items</h3>
                  <p className="text-xs text-muted-foreground">
                    Vendor: <strong className="text-foreground">{activeJobToComplete.technicianOrVendor}</strong> (Total {activeJobToComplete.quantity} units)
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitComplete} className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-2xl text-xs space-y-1">
                <p>
                  <strong>Product:</strong> {activeJobToComplete.product?.name || "Product"}
                </p>
                <p>
                  <strong>Challan:</strong> {activeJobToComplete.repairInvoiceNo}
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
                  <span className="text-[10px] text-muted-foreground">Will return to sellable stock</span>
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
                  <span className="text-[10px] text-muted-foreground">Will return to defective stock</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Actual Repair Cost Paid (PKR)
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
                  placeholder="e.g. Components replaced, tested OK under 220V/440V load..."
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
                  {completing ? "Saving..." : "Confirm & Update Stock"}
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
