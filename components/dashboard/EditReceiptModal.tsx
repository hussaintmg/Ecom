"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import {
  X,
  Truck,
  Building2,
  Phone,
  Globe,
  Calendar,
  StickyNote,
  Save,
  Package,
  RefreshCw,
} from "lucide-react";
import toast from "@/utils/toast";

interface EditReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: any | null;
  onSaved: () => void;
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (receipt && isOpen) {
      setVendor(receipt.vendor || "");
      setReceiptNumber(receipt.receiptNumber || "");
      setOrigin(receipt.origin || "Taiwan");
      setVendorContact(receipt.vendorContact || "");
      setNotes(receipt.notes || "");
      if (receipt.receivedAt) {
        try {
          const d = new Date(receipt.receivedAt);
          setReceivedAt(d.toISOString().slice(0, 10));
        } catch {
          setReceivedAt("");
        }
      } else {
        setReceivedAt("");
      }
    }
  }, [receipt, isOpen]);

  if (!isOpen || !receipt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim()) {
      toast.error("Vendor / Supplier name is required.");
      return;
    }
    if (!receiptNumber.trim()) {
      toast.error("Receipt reference number is required.");
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
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Shipment details updated successfully!");
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

  const totalItemsCount = receipt.items?.reduce(
    (acc: number, item: any) => acc + (item.qtyReceived || 0),
    0
  ) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Edit Shipment Details</h3>
              <p className="text-xs text-neutral-400">
                Updating shipment #{receipt.receiptNumber} &bull; Status: {receipt.status}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
                <Truck size={14} className="text-cyan-400" /> Reference Number *
              </label>
              <input
                type="text"
                required
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="REC-..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
                <Building2 size={14} className="text-cyan-400" /> Vendor / Supplier Name *
              </label>
              <input
                type="text"
                required
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Supplier name..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
                <Globe size={14} className="text-cyan-400" /> Origin
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Taiwan, China, Japan, Local..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
                <Phone size={14} className="text-cyan-400" /> Vendor Contact
              </label>
              <input
                type="text"
                value={vendorContact}
                onChange={(e) => setVendorContact(e.target.value)}
                placeholder="Phone or email..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
                <Calendar size={14} className="text-cyan-400" /> Received Date
              </label>
              <input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
              <StickyNote size={14} className="text-cyan-400" /> Receiving Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add shipment notes, bill of lading references, or carrier tracking details..."
              className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Included Items Preview */}
          <div className="border border-white/10 rounded-xl p-3 bg-neutral-950/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Package size={14} className="text-cyan-400" /> Shipment Manifest Items
              </span>
              <span className="text-[11px] font-medium text-neutral-400">
                {receipt.items?.length || 0} line item(s) &bull; {totalItemsCount} total units
              </span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {receipt.items?.map((item: any, idx: number) => (
                <div
                  key={item._id || idx}
                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-neutral-900/60 border border-white/5"
                >
                  <span className="font-medium text-neutral-200 truncate max-w-[240px]">
                    {item.product?.name || "Product"}
                  </span>
                  <div className="flex items-center gap-3 text-neutral-400">
                    <span>Recv: <strong className="text-white">{item.qtyReceived}</strong></span>
                    <span>Pending: <strong className="text-amber-400">{item.qtyPending}</strong></span>
                    <span>Good: <strong className="text-emerald-400">{item.qtyGood}</strong></span>
                    <span>Def: <strong className="text-rose-400">{item.qtyDefective}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="border-white/10 text-neutral-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold gap-2 px-5"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={14} /> Update Shipment
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
