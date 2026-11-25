"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { LightModalShell } from "@/components/dashboard/LightModalShell";
import {
  EditModalProductPicker,
  CatalogProductOption,
} from "@/components/dashboard/EditModalProductPicker";
import {
  Wrench,
  User,
  Phone,
  MapPin,
  Calendar,
  StickyNote,
  Save,
  Package,
  RefreshCw,
  Trash2,
  ArrowLeftRight,
  Lock,
  Plus,
  Search,
  X,
} from "lucide-react";
import toast from "@/utils/toast";

interface EditRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  repairBatch: any | null;
  onSaved: () => void;
}

interface EditableRepairRow {
  rowKey: string;
  repairJobId?: string;
  productId: string;
  defectiveId?: string;
  productName: string;
  productImage: string;
  quantity: number;
  doneQty: number;
  availableDefectiveMax?: number;
  estimatedCost: number;
  actualCost: number;
  problemDescription: string;
  notes: string;
}

export const EditRepairModal: React.FC<EditRepairModalProps> = ({
  isOpen,
  onClose,
  repairBatch,
  onSaved,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [technicianOrVendor, setTechnicianOrVendor] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EditableRepairRow[]>([]);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [addingDefectiveOpen, setAddingDefectiveOpen] = useState(false);
  const [defectiveOptions, setDefectiveOptions] = useState<any[]>([]);
  const [defectiveSearch, setDefectiveSearch] = useState("");
  const [loadingDefective, setLoadingDefective] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isCustomer = repairBatch?.repairSource === "customer";

  useEffect(() => {
    if (repairBatch && isOpen) {
      setCustomerName(repairBatch.customerName || "");
      setCustomerPhone(repairBatch.customerPhone || "");
      setCustomerAddress(repairBatch.customerAddress || "");
      setTechnicianOrVendor(repairBatch.technicianOrVendor || "");
      setVendorPhone(repairBatch.vendorPhone || "");
      setVendorAddress(repairBatch.vendorAddress || "");
      setNotes(repairBatch.notes || "");
      setSwappingIndex(null);
      setAddingDefectiveOpen(false);
      setDefectiveSearch("");

      if (repairBatch.expectedReturnDate) {
        try {
          setExpectedReturnDate(new Date(repairBatch.expectedReturnDate).toISOString().slice(0, 10));
        } catch {
          setExpectedReturnDate("");
        }
      } else {
        setExpectedReturnDate("");
      }

      const rawItems =
        repairBatch.items && repairBatch.items.length > 0 ? repairBatch.items : [repairBatch];

      setItems(
        rawItems.map((it: any, idx: number) => {
          const doneQty = Number(it.quantityRepaired || 0) + Number(it.quantityFailed || 0);
          const pid = String(it.product?._id || it.product || it.productId || "");
          const defId = it.defectiveInventory?._id || it.defectiveInventory || it.defectiveId;
          return {
            rowKey: `${it._id || it.repairJobId || pid}-${idx}-${Date.now()}`,
            repairJobId: String(it.repairJobId || it._id || ""),
            productId: pid,
            defectiveId: defId ? String(defId) : undefined,
            productName: it.productName || it.product?.name || "Product",
            productImage:
              it.productImage ||
              it.product?.images?.[0]?.url ||
              (typeof it.product?.images?.[0] === "string" ? it.product?.images?.[0] : ""),
            quantity: Math.max(1, Number(it.quantity || 1)),
            doneQty,
            estimatedCost: Number(it.estimatedCost || 0),
            actualCost: Number(it.actualCost || 0),
            problemDescription: it.problemDescription || it.defectReason || "",
            notes: it.notes || "",
          };
        })
      );
    }
  }, [repairBatch, isOpen]);

  // Fetch available defective inventory when picking for store defective repairs
  useEffect(() => {
    if (!isOpen || isCustomer) return;
    if (!addingDefectiveOpen && swappingIndex === null) return;
    let active = true;
    setLoadingDefective(true);
    fetch("/api/inventory/defective?hasAvailable=true&limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setDefectiveOptions(data.defectiveList || data.defective || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingDefective(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, isCustomer, addingDefectiveOpen, swappingIndex]);

  const handleQtyChange = (index: number, nextQty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const minFloor = Math.max(1, item.doneQty);
      item.quantity = Math.max(minFloor, Math.floor(nextQty || minFloor));
      copy[index] = item;
      return copy;
    });
  };

  const handleFieldChange = (
    index: number,
    field: "estimatedCost" | "actualCost" | "problemDescription" | "notes",
    val: string | number
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSwapCustomerProduct = (index: number, newProd: CatalogProductOption) => {
    const imgUrl =
      typeof newProd.images?.[0] === "string"
        ? newProd.images[0]
        : newProd.images?.[0]?.url || "";
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: newProd._id,
        productName: newProd.name,
        productImage: imgUrl,
      };
      return copy;
    });
    setSwappingIndex(null);
  };

  const handleAddCustomerProduct = (newProd: CatalogProductOption) => {
    const imgUrl =
      typeof newProd.images?.[0] === "string"
        ? newProd.images[0]
        : newProd.images?.[0]?.url || "";
    setItems((prev) => [
      ...prev,
      {
        rowKey: `${newProd._id}-${Date.now()}`,
        productId: newProd._id,
        productName: newProd.name,
        productImage: imgUrl,
        quantity: 1,
        doneQty: 0,
        estimatedCost: 0,
        actualCost: 0,
        problemDescription: "Customer Reported Fault",
        notes: "",
      },
    ]);
  };

  const handlePickDefectiveBatch = (def: any, swapIdx: number | null) => {
    const prod = def.product || {};
    const imgUrl =
      typeof prod.images?.[0] === "string" ? prod.images[0] : prod.images?.[0]?.url || "";
    if (swapIdx !== null) {
      setItems((prev) => {
        const copy = [...prev];
        copy[swapIdx] = {
          ...copy[swapIdx],
          productId: String(prod._id || def.product),
          defectiveId: String(def._id),
          productName: prod.name || "Defective Product",
          productImage: imgUrl,
          availableDefectiveMax: Number(def.availableDefectiveQuantity || 1),
          problemDescription: def.defectReason || copy[swapIdx].problemDescription,
        };
        return copy;
      });
      setSwappingIndex(null);
    } else {
      setItems((prev) => [
        ...prev,
        {
          rowKey: `${def._id}-${Date.now()}`,
          productId: String(prod._id || def.product),
          defectiveId: String(def._id),
          productName: prod.name || "Defective Product",
          productImage: imgUrl,
          quantity: 1,
          doneQty: 0,
          availableDefectiveMax: Number(def.availableDefectiveQuantity || 1),
          estimatedCost: 0,
          actualCost: 0,
          problemDescription: def.defectReason || "Reported Fault",
          notes: def.description || "",
        },
      ]);
      setAddingDefectiveOpen(false);
    }
    setDefectiveSearch("");
  };

  const handleRemoveItem = (index: number) => {
    const item = items[index];
    if (item.doneQty > 0) {
      toast.error("Cannot remove an item that already has repaired/failed units.");
      return;
    }
    if (items.length <= 1) {
      toast.error("Repair challan must keep at least one item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (swappingIndex === index) setSwappingIndex(null);
  };

  const totalUnits = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const totalEstCost = items.reduce(
    (sum, it) => sum + (Number(it.estimatedCost) || 0) * (Number(it.quantity) || 1),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairBatch) return;
    if (items.length === 0) {
      toast.error("At least one repair item is required.");
      return;
    }

    const challanKey = repairBatch.repairInvoiceNo || `REP-LEGACY-${repairBatch._id}`;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/inventory/repairs/challan/${encodeURIComponent(challanKey)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerAddress: customerAddress.trim(),
            technicianOrVendor: technicianOrVendor.trim(),
            vendorPhone: vendorPhone.trim(),
            vendorAddress: vendorAddress.trim(),
            expectedReturnDate: expectedReturnDate || null,
            notes: notes.trim(),
            items: items.map((it) => ({
              repairJobId: it.repairJobId || undefined,
              productId: it.productId,
              defectiveId: it.defectiveId || undefined,
              quantity: it.quantity,
              estimatedCost: Number(it.estimatedCost || 0),
              actualCost: Number(it.actualCost || 0),
              problemDescription: it.problemDescription,
              notes: it.notes,
            })),
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Repair challan updated & inventory synchronized!");
        onSaved();
        onClose();
      } else {
        toast.error(data.error || "Failed to update repair challan");
      }
    } catch {
      toast.error("Network error updating repair challan");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDefective = defectiveOptions.filter((d) => {
    const q = defectiveSearch.trim().toLowerCase();
    if (!q) return true;
    const pName = (d.product?.name || "").toLowerCase();
    const reason = (d.defectReason || "").toLowerCase();
    return pName.includes(q) || reason.includes(q);
  });

  const renderDefectivePicker = (swapIdx: number | null) => (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-2xl border border-border bg-card shadow-lg p-3 space-y-2.5"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={defectiveSearch}
            onChange={(e) => setDefectiveSearch(e.target.value)}
            placeholder="Search available defective inventory batch..."
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/25"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (swapIdx !== null) setSwappingIndex(null);
            else setAddingDefectiveOpen(false);
          }}
          className="w-8 h-8 rounded-xl border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-border/60 rounded-xl border border-border bg-background">
        {loadingDefective ? (
          <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw size={13} className="animate-spin" /> Loading defective batches...
          </div>
        ) : filteredDefective.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No available defective batches found.
          </div>
        ) : (
          filteredDefective.map((d) => (
            <button
              key={d._id}
              type="button"
              onClick={() => handlePickDefectiveBatch(d, swapIdx)}
              className="w-full flex items-center justify-between p-2.5 text-left hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {d.product?.name || "Defective Product"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Reason: {d.defectReason || "Fault"} • Batch #{String(d._id).slice(-6).toUpperCase()}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                Avail: {d.availableDefectiveQuantity}
              </span>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );

  return (
    <LightModalShell
      isOpen={isOpen && !!repairBatch}
      onClose={onClose}
      icon={<Wrench size={20} />}
      iconBgClass="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
      title={
        repairBatch
          ? `Edit Repair Challan #${repairBatch.repairInvoiceNo || repairBatch._id?.slice(-6).toUpperCase()}`
          : "Edit Repair"
      }
      subtitle={
        repairBatch ? (
          <span>
            Mode:{" "}
            <strong className={isCustomer ? "text-primary" : "text-amber-600"}>
              {isCustomer ? "Customer Repair Receipt" : "Store Defective Repair"}
            </strong>{" "}
            • Status: <strong>{repairBatch.status}</strong>
          </span>
        ) : undefined
      }
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {/* Customer / Vendor Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isCustomer && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <User size={12} className="text-amber-600" /> Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                    placeholder="Customer full name"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <Phone size={12} className="text-amber-600" /> Customer Phone
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                    placeholder="Customer phone"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <MapPin size={12} className="text-amber-600" /> Customer Address
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                    placeholder="Customer address"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Wrench size={12} className="text-amber-600" />{" "}
                {isCustomer ? "Assigned Technician / Workshop" : "Repair Vendor / Workshop"}
              </label>
              <input
                type="text"
                value={technicianOrVendor}
                onChange={(e) => setTechnicianOrVendor(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                placeholder="Vendor or technician name"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Phone size={12} className="text-amber-600" /> Vendor Contact
              </label>
              <input
                type="text"
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                placeholder="Technician/Vendor phone"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Calendar size={12} className="text-amber-600" /> Expected Return Date
              </label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <StickyNote size={12} className="text-amber-600" /> General Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                placeholder="Overall repair remarks"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package size={13} className="text-amber-600" /> Repair Products ({items.length})
              </h4>

              {isCustomer ? (
                <EditModalProductPicker
                  onSelect={handleAddCustomerProduct}
                  buttonLabel="Add Product"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingDefectiveOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-600/25 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus size={14} /> Add Defective Item
                </button>
              )}
            </div>

            <AnimatePresence>
              {!isCustomer && addingDefectiveOpen && renderDefectivePicker(null)}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const isLocked = item.doneQty > 0;
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      key={item.rowKey}
                      className="bg-muted/35 border border-border rounded-2xl p-3.5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-9 h-9 rounded-xl object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                              <Package size={15} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-foreground truncate">{item.productName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {isLocked
                                ? `${item.doneQty} units already completed/failed`
                                : "In Progress — editable"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted border border-border text-[10px] font-bold text-muted-foreground">
                              <Lock size={11} /> Processed: {item.doneQty}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setSwappingIndex(swappingIndex === idx ? null : idx)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                                  swappingIndex === idx
                                    ? "border-amber-500 bg-amber-50 text-amber-800"
                                    : "border-border bg-background text-foreground hover:bg-muted"
                                }`}
                              >
                                <ArrowLeftRight size={12} /> Change
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 cursor-pointer"
                                title="Remove repair item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {swappingIndex === idx &&
                          !isLocked &&
                          (isCustomer ? (
                            <EditModalProductPicker
                              autoOpen
                              compact
                              placeholder={`Replace "${item.productName}" with...`}
                              onSelect={(newProd) => handleSwapCustomerProduct(idx, newProd)}
                              onCancel={() => setSwappingIndex(null)}
                            />
                          ) : (
                            renderDefectivePicker(idx)
                          ))}
                      </AnimatePresence>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground">
                            Quantity * {isLocked ? `(min ${item.doneQty})` : ""}
                          </label>
                          <input
                            type="number"
                            min={Math.max(1, item.doneQty)}
                            required
                            value={item.quantity}
                            onChange={(e) => handleQtyChange(idx, parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-bold text-foreground mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground">
                            Est. Cost / Unit (PKR)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.estimatedCost}
                            onChange={(e) =>
                              handleFieldChange(idx, "estimatedCost", parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-700 mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[10px] font-bold text-muted-foreground">Subtotal</label>
                          <div className="text-xs font-mono font-bold py-2 px-2.5 rounded-xl bg-background border border-border/70 text-foreground mt-0.5">
                            Rs. {(item.quantity * item.estimatedCost).toLocaleString()}
                          </div>
                        </div>

                        <div className="col-span-2 sm:col-span-3">
                          <label className="text-[10px] font-bold text-muted-foreground">
                            Defect / Problem Notes
                          </label>
                          <input
                            type="text"
                            value={item.problemDescription}
                            onChange={(e) =>
                              handleFieldChange(idx, "problemDescription", e.target.value)
                            }
                            placeholder="Fault description or technician remarks"
                            className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer & Totals */}
        <div className="px-5 sm:px-6 py-4 border-t border-border bg-muted/25 space-y-3 shrink-0">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs font-bold dark:bg-amber-500/10 dark:border-amber-500/25">
            <span className="text-foreground">Total Repair Units: {totalUnits}</span>
            <span className="font-mono font-black text-amber-800 dark:text-amber-300">
              Est. Total Fee: PKR {totalEstCost.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="h-9 px-4 rounded-xl border-border text-foreground font-bold hover:bg-muted"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-9 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm shadow-amber-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Repair Challan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </LightModalShell>
  );
};
