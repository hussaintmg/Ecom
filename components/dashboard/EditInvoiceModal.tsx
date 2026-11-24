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
  Package,
  Save,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { InvoiceItem } from "@/context/InvoiceContext";
import toast from "@/utils/toast";

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceItem | null;
  onSave: (
    id: string,
    data: {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      customerCity?: string;
      customerNote?: string;
      products?: any[];
    }
  ) => Promise<{ success: boolean; error?: string }>;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      setCustomerName(invoice.customerName || "");
      setCustomerPhone(invoice.customerPhone || "");
      setCustomerEmail(invoice.customerEmail || "");
      setCustomerAddress(invoice.customerAddress || "");
      setCustomerCity(invoice.customerCity || "");
      setCustomerNote(invoice.customerNote || "");

      const rawItems =
        invoice.products && invoice.products.length > 0
          ? invoice.products
          : [
              {
                product: invoice.product,
                category: invoice.category,
                quantity: invoice.quantity || 1,
                salePrice: invoice.salePrice || invoice.totalAmount || 0,
                description: invoice.description || "",
              },
            ];

      setProducts(
        rawItems.map((p: any) => ({
          productId: p.product?._id || p.product,
          productName: p.product?.name || "Product",
          productImage:
            p.product?.images?.[0]?.url ||
            (typeof p.product?.images?.[0] === "string" ? p.product?.images?.[0] : ""),
          categoryId: p.category?._id || p.category,
          categoryName: p.category?.name || "Category",
          quantity: Number(p.quantity || 1),
          salePrice: Number(p.salePrice || 0),
          unitPrice: Math.round(Number(p.salePrice || 0) / Math.max(1, Number(p.quantity || 1))),
          description: p.description || "",
        }))
      );
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setProducts((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.quantity = newQty;
      item.salePrice = item.unitPrice * newQty;
      copy[index] = item;
      return copy;
    });
  };

  const handleSalePriceChange = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setProducts((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.salePrice = newPrice;
      item.unitPrice = Math.round(newPrice / Math.max(1, item.quantity));
      copy[index] = item;
      return copy;
    });
  };

  const handleDescriptionChange = (index: number, newDesc: string) => {
    setProducts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], description: newDesc };
      return copy;
    });
  };

  const calculatedTotal = products.reduce((acc, p) => acc + (Number(p.salePrice) || 0), 0);

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
        products: products.map((p) => ({
          productId: p.productId,
          categoryId: p.categoryId,
          quantity: p.quantity,
          salePrice: p.salePrice,
          description: p.description,
        })),
      };

      const res = await onSave(invoice._id, payload);
      if (res.success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden text-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Package size={20} className="text-primary" />
              Edit Invoice #{invoice._id.slice(-6).toUpperCase()}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Type: <span className="font-semibold text-emerald-400">{invoice.type || "Sell"}</span> • Created:{" "}
              {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* Customer Details Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <User size={14} /> Customer Information
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
                    placeholder="Full name"
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
                    placeholder="e.g. Lahore, Karachi"
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
                    placeholder="Full street address"
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
                    placeholder="Special instructions or notes"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Package size={14} /> Line Items & Pricing
              </h4>
              <span className="text-[11px] text-neutral-400">
                Total Items: <strong className="text-white">{products.length}</strong>
              </span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2.5 text-amber-300 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>
                <strong>Inventory Note:</strong> Modifying quantities on a Sell invoice will automatically
                reconcile product warehouse stock (deducting or returning stock) and create audit logs.
              </p>
            </div>

            <div className="space-y-3">
              {products.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950/60 border border-white/10 rounded-2xl p-3 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-xs font-bold shrink-0">
                        PROD
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{item.productName}</p>
                      <p className="text-[10px] text-neutral-400 truncate">{item.categoryName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400">Total Price (PKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.salePrice}
                        onChange={(e) => handleSalePriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-neutral-400">Unit Price</label>
                      <div className="text-xs font-mono py-1.5 text-neutral-300">
                        Rs. {(item.unitPrice || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-3">
                      <label className="text-[10px] font-bold text-neutral-400">Description / Serial</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                        placeholder="Item notes, serial number, condition"
                        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Summary */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400">Grand Total:</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              Rs. {calculatedTotal.toLocaleString()}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
                  <RefreshCw size={14} className="animate-spin" /> Saving Changes...
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
