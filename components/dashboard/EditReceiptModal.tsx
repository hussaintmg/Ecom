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
  Truck,
  Building2,
  Phone,
  Globe,
  Calendar,
  StickyNote,
  Save,
  Package,
  RefreshCw,
  Trash2,
  ArrowLeftRight,
  Lock,
} from "lucide-react";
import toast from "@/utils/toast";

interface EditReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: any | null;
  onSaved: () => void;
}

interface EditableReceiptRow {
  rowKey: string;
  _id?: string;
  productId: string;
  productName: string;
  productImage: string;
  qtyReceived: number;
  qtyGood: number;
  qtyDefective: number;
  unitCost: number;
}

export const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onSaved,
}) => {
  const [vendor, setVendor] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [origin, setOrigin] = useState("Taiwan");
  const [vendorContact, setVendorContact] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [items, setItems] = useState<EditableReceiptRow[]>([]);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (receipt && isOpen) {
      setVendor(receipt.vendor || "");
      setReceiptNumber(receipt.receiptNumber || "");
      setOrigin(receipt.origin || "Taiwan");
      setVendorContact(receipt.vendorContact || "");
      setNotes(receipt.notes || "");
      setSwappingIndex(null);

      if (receipt.receivedAt) {
        try {
          setReceivedAt(new Date(receipt.receivedAt).toISOString().slice(0, 10));
        } catch {
          setReceivedAt("");
        }
      } else {
        setReceivedAt("");
      }

      setItems(
        (receipt.items || []).map((it: any, idx: number) => ({
          rowKey: `${it._id || it.product?._id || idx}-${Date.now()}`,
          _id: it._id ? String(it._id) : undefined,
          productId: String(it.product?._id || it.product || ""),
          productName: it.product?.name || "Deleted Product",
          productImage:
            it.product?.images?.[0]?.url ||
            (typeof it.product?.images?.[0] === "string" ? it.product?.images?.[0] : ""),
          qtyReceived: Number(it.qtyReceived || 1),
          qtyGood: Number(it.qtyGood || 0),
          qtyDefective: Number(it.qtyDefective || 0),
          unitCost: Number(it.unitCost || 0),
        }))
      );
    }
  }, [receipt, isOpen]);

  const handleQtyChange = (index: number, nextQty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const minFloor = Math.max(1, item.qtyGood + item.qtyDefective);
      item.qtyReceived = Math.max(minFloor, Math.floor(nextQty || minFloor));
      copy[index] = item;
      return copy;
    });
  };

  const handleUnitCostChange = (index: number, nextCost: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], unitCost: Math.max(0, Number(nextCost || 0)) };
      return copy;
    });
  };

  const handleSwapProduct = (index: number, newProd: CatalogProductOption) => {
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
        unitCost: newProd.price ? Math.round(newProd.price * 0.7) : copy[index].unitCost,
      };
      return copy;
    });
    setSwappingIndex(null);
  };

  const handleAddProduct = (newProd: CatalogProductOption) => {
    const imgUrl =
      typeof newProd.images?.[0] === "string"
        ? newProd.images[0]
        : newProd.images?.[0]?.url || "";

    setItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.productId === newProd._id);
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          qtyReceived: copy[existingIdx].qtyReceived + 1,
        };
        toast.success(`Increased received qty for ${newProd.name}`);
        return copy;
      }

      return [
        ...prev,
        {
          rowKey: `${newProd._id}-${Date.now()}`,
          productId: newProd._id,
          productName: newProd.name,
          productImage: imgUrl,
          qtyReceived: 1,
          qtyGood: 0,
          qtyDefective: 0,
          unitCost: newProd.price ? Math.round(newProd.price * 0.7) : 0,
        },
      ];
    });
  };

  const handleRemoveItem = (index: number) => {
    const target = items[index];
    if (target.qtyGood + target.qtyDefective > 0) {
      toast.error("Cannot remove an item that already has Good/Defective inspected units.");
      return;
    }
    if (items.length <= 1) {
      toast.error("Shipment must keep at least one product item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (swappingIndex === index) setSwappingIndex(null);
  };

  const totalUnits = items.reduce((acc, it) => acc + (it.qtyReceived || 0), 0);
  const totalPending = items.reduce(
    (acc, it) => acc + Math.max(0, it.qtyReceived - it.qtyGood - it.qtyDefective),
    0
  );
  const totalShipmentCost = items.reduce(
    (acc, it) => acc + (it.qtyReceived || 0) * (it.unitCost || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt) return;
    if (!vendor.trim()) {
      toast.error("Vendor / Supplier name is required.");
      return;
    }
    if (!receiptNumber.trim()) {
      toast.error("Receipt reference number is required.");
      return;
    }
    if (items.length === 0) {
      toast.error("Shipment must contain at least one product item.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/inventory/receipts/${receipt._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: vendor.trim(),
          receiptNumber: receiptNumber.trim(),
          origin: origin.trim(),
          vendorContact: vendorContact.trim(),
          notes: notes.trim(),
          receivedAt,
          items: items.map((it) => ({
            _id: it._id,
            productId: it.productId,
            qtyReceived: it.qtyReceived,
            unitCost: it.unitCost,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Shipment & manifest updated successfully!");
        onSaved();
        onClose();
      } else {
        toast.error(data.error || "Failed to update shipment");
      }
    } catch {
      toast.error("Network error while updating shipment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LightModalShell
      isOpen={isOpen && !!receipt}
      onClose={onClose}
      icon={<Truck size={20} />}
      iconBgClass="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
      title={receipt ? `Edit Shipment #${receipt.receiptNumber}` : "Edit Shipment"}
      subtitle={receipt ? `Status: ${receipt.status}` : undefined}
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
                <Truck size={13} className="text-amber-600" /> Reference Number *
              </label>
              <input
                type="text"
                required
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="REC-..."
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
                <Building2 size={13} className="text-amber-600" /> Vendor / Supplier Name *
              </label>
              <input
                type="text"
                required
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Supplier name..."
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
                <Globe size={13} className="text-amber-600" /> Origin
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Taiwan, China, Japan, Local..."
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
                <Phone size={13} className="text-amber-600" /> Vendor Contact
              </label>
              <input
                type="text"
                value={vendorContact}
                onChange={(e) => setVendorContact(e.target.value)}
                placeholder="Phone or email..."
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
                <Calendar size={13} className="text-amber-600" /> Received Date
              </label>
              <input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
                <StickyNote size={13} className="text-amber-600" /> Receiving Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Carrier tracking, bill of lading..."
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Manifest Items Editor */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package size={13} className="text-amber-600" /> Shipment Manifest Items ({items.length})
              </h4>
              <EditModalProductPicker
                onSelect={handleAddProduct}
                buttonLabel="Add Product to Shipment"
                excludeIds={items.map((it) => it.productId)}
              />
            </div>

            <AnimatePresence initial={false}>
              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const processedQty = item.qtyGood + item.qtyDefective;
                  const isLockedProduct = processedQty > 0;
                  const pendingNow = Math.max(0, item.qtyReceived - processedQty);

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      key={item.rowKey}
                      className="bg-muted/35 border border-border rounded-2xl p-3.5 space-y-2.5"
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
                            <div className="flex flex-wrap items-center gap-2 text-[10px] mt-0.5">
                              <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Pending: {pendingNow}
                              </span>
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Good: +{item.qtyGood}
                              </span>
                              <span className="text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                Defective: {item.qtyDefective}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLockedProduct ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted border border-border text-[10px] font-bold text-muted-foreground"
                              title="Already inspected units cannot be swapped or deleted"
                            >
                              <Lock size={11} /> {processedQty} Inspected
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
                                title="Remove uninspected item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {swappingIndex === idx && !isLockedProduct && (
                          <EditModalProductPicker
                            autoOpen
                            compact
                            placeholder={`Replace "${item.productName}" with...`}
                            onSelect={(newProd) => handleSwapProduct(idx, newProd)}
                            onCancel={() => setSwappingIndex(null)}
                          />
                        )}
                      </AnimatePresence>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground">
                            Qty Received * {isLockedProduct ? `(min ${processedQty})` : ""}
                          </label>
                          <input
                            type="number"
                            min={Math.max(1, processedQty)}
                            required
                            value={item.qtyReceived}
                            onChange={(e) => handleQtyChange(idx, parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-bold text-foreground mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground">Unit Cost (PKR)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.unitCost}
                            onChange={(e) => handleUnitCostChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-bold text-foreground mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[10px] font-bold text-muted-foreground">Line Cost</label>
                          <div className="text-xs font-mono font-bold py-2 px-2.5 rounded-xl bg-background border border-border/70 text-foreground mt-0.5">
                            Rs. {(item.qtyReceived * item.unitCost).toLocaleString()}
                          </div>
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
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold dark:bg-amber-500/10 dark:border-amber-500/25">
            <div className="flex items-center gap-3">
              <span className="text-foreground">Total Received: {totalUnits} units</span>
              <span className="text-amber-700">Pending QA: {totalPending} units</span>
            </div>
            <span className="font-mono font-black text-foreground">
              Est. Shipment Value: PKR {totalShipmentCost.toLocaleString()}
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
                  <span>Update Shipment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </LightModalShell>
  );
};
