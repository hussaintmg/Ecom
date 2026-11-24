"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  StickyNote,
  CreditCard,
  Save,
  Package,
  RefreshCw,
} from "lucide-react";
import { CreditSaleItem } from "@/context/CreditSaleContext";
import toast from "@/utils/toast";

interface EditCreditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditSale: CreditSaleItem | null;
  onSave: (
    id: string,
    data: {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      customerCity?: string;
      customerNote?: string;
      description?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
}

export const EditCreditSaleModal: React.FC<EditCreditSaleModalProps> = ({
  isOpen,
  onClose,
  creditSale,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (creditSale && isOpen) {
      setCustomerName(creditSale.customerName || "");
      setCustomerPhone(creditSale.customerPhone || "");
      setCustomerEmail(creditSale.customerEmail || "");
      setCustomerAddress(creditSale.customerAddress || "");
      setCustomerCity(creditSale.customerCity || "");
      setCustomerNote(creditSale.customerNote || "");
      const desc =
        creditSale.products && creditSale.products[0]?.description
          ? creditSale.products[0].description
          : "";
      setDescription(desc);
    }
  }, [creditSale, isOpen]);

  if (!isOpen || !creditSale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerAddress: customerAddress.trim(),
        customerCity: customerCity.trim(),
        customerNote: customerNote.trim(),
        description: description.trim(),
      };

      const res = await onSave(creditSale._id, payload);
      if (res.success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const remaining = Number(creditSale.remainingAmount ?? creditSale.totalAmount ?? 0);
  const paid = Number(creditSale.paidAmount ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden text-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              Edit Credit Sale #{creditSale._id.slice(-6).toUpperCase()}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Status:{" "}
              <span
                className={`font-semibold ${
                  creditSale.status === "Paid"
                    ? "text-emerald-400"
                    : creditSale.status === "Reverted"
                    ? "text-red-400"
                    : "text-amber-400"
                }`}
              >
                {creditSale.status || "Open"}
              </span>{" "}
              • Created: {new Date(creditSale.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Balance Snapshot */}
        <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-2xl bg-neutral-950/80 border border-white/10 text-center">
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">Total Bill</p>
            <p className="text-xs font-mono font-black text-white mt-0.5">
              Rs. {Number(creditSale.totalAmount || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">Total Paid</p>
            <p className="text-xs font-mono font-black text-emerald-400 mt-0.5">
              Rs. {paid.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">Remaining</p>
            <p className="text-xs font-mono font-black text-amber-400 mt-0.5">
              Rs. {remaining.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <User size={14} /> Customer Contact & Delivery Info
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-300">Customer Name *</label>
                <div className="relative mt-1">
                  <User size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Full customer name"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300">Phone Number</label>
                <div className="relative mt-1">
                  <Phone size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300">Email Address</label>
                <div className="relative mt-1">
                  <Mail size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300">City</label>
                <div className="relative mt-1">
                  <Building2 size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="City"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-neutral-300">Delivery Address</label>
                <div className="relative mt-1">
                  <MapPin size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Delivery address"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-neutral-300">Customer Note</label>
                <div className="relative mt-1">
                  <StickyNote size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Customer instructions"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-neutral-300">Sale Remarks / Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950/80 border border-white/10 rounded-xl p-2.5 text-xs text-white mt-1 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Terms, warranty conditions, payment terms notes"
                />
              </div>
            </div>
          </div>

          {/* Purchased Items Overview (Readonly) */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Package size={14} /> Purchased Items ({creditSale.products?.length || 0})
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {(creditSale.products || []).map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/40 border border-white/5 text-xs"
                >
                  <span className="font-semibold text-neutral-200">
                    {p.product?.name || "Product"} × {p.quantity}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    Rs. {Number(p.salePrice || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-neutral-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={14} /> Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
