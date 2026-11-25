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
  Trash2,
  ArrowLeftRight,
  ReceiptText,
  Plus,
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

interface EditableInvoiceRow {
  rowKey: string;
  productId: string;
  productName: string;
  productImage: string;
  availableStock: number;
  originalQty: number;
  categoryId: string;
  categoryName: string;
  quantity: number;
  salePrice: number;
  unitPrice: number;
  description: string;
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
  const [products, setProducts] = useState<EditableInvoiceRow[]>([]);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      setCustomerName(invoice.customerName || "");
      setCustomerPhone(invoice.customerPhone || "");
      setCustomerEmail(invoice.customerEmail || "");
      setCustomerAddress(invoice.customerAddress || "");
      setCustomerCity(invoice.customerCity || "");
      setCustomerNote(invoice.customerNote || "");
      setShowAddPicker(false);
      setSwappingIndex(null);

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
        rawItems.map((p: any, idx: number) => {
          const qty = Math.max(1, Number(p.quantity || 1));
          const salePrice = Number(p.salePrice || 0);
          return {
            rowKey: `${p.product?._id || p.product || "row"}-${idx}-${Date.now()}`,
            productId: String(p.product?._id || p.product || ""),
            productName: p.product?.name || "Deleted Product",
            productImage:
              p.product?.images?.[0]?.url ||
              (typeof p.product?.images?.[0] === "string" ? p.product?.images?.[0] : ""),
            availableStock: Number(p.product?.stock ?? 0),
            originalQty: qty,
            categoryId: String(p.category?._id || p.category || ""),
            categoryName: p.category?.name || "Category",
            quantity: qty,
            salePrice,
            unitPrice: Math.round(salePrice / qty),
            description: p.description || "",
          };
        })
      );
    }
  }, [invoice, isOpen]);

  const handleQuantityChange = (index: number, newQty: number) => {
    const safeQty = Math.max(1, Math.floor(newQty || 1));
    setProducts((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.quantity = safeQty;
      item.salePrice = Math.max(0, Math.round(item.unitPrice * safeQty));
      copy[index] = item;
      return copy;
    });
  };

  const handleSalePriceChange = (index: number, newPrice: number) => {
    const safePrice = Math.max(0, Number(newPrice || 0));
    setProducts((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.salePrice = safePrice;
      item.unitPrice = Math.round(safePrice / Math.max(1, item.quantity));
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

  const handleSwapProduct = (index: number, newProd: CatalogProductOption) => {
    const unitPrice = Number(newProd.price || 0);
    const imgUrl =
      typeof newProd.images?.[0] === "string"
        ? newProd.images[0]
        : newProd.images?.[0]?.url || "";
    const catId = typeof newProd.category === "object" ? newProd.category?._id || "" : String(newProd.category || "");
    const catName = typeof newProd.category === "object" ? newProd.category?.name || "Category" : "Category";

    setProducts((prev) => {
      const copy = [...prev];
      const existingQty = copy[index].quantity || 1;
      copy[index] = {
        ...copy[index],
        productId: newProd._id,
        productName: newProd.name,
        productImage: imgUrl,
        availableStock: Number(newProd.stock ?? 0),
        originalQty: 0, // Brand-new product on this row
        categoryId: catId,
        categoryName: catName,
        unitPrice,
        salePrice: unitPrice * existingQty,
      };
      return copy;
    });
    setSwappingIndex(null);
  };

  const handleAddProduct = (newProd: CatalogProductOption) => {
    const unitPrice = Number(newProd.price || 0);
    const imgUrl =
      typeof newProd.images?.[0] === "string"
        ? newProd.images[0]
        : newProd.images?.[0]?.url || "";
    const catId = typeof newProd.category === "object" ? newProd.category?._id || "" : String(newProd.category || "");
    const catName = typeof newProd.category === "object" ? newProd.category?.name || "Category" : "Category";

    setProducts((prev) => {
      const existingIdx = prev.findIndex((row) => row.productId === newProd._id);
      if (existingIdx !== -1) {
        const copy = [...prev];
        const target = { ...copy[existingIdx] };
        target.quantity += 1;
        target.salePrice = target.unitPrice * target.quantity;
        copy[existingIdx] = target;
        toast.success(`Increased quantity for ${newProd.name}`);
        return copy;
      }

      return [
        ...prev,
        {
          rowKey: `${newProd._id}-${Date.now()}`,
          productId: newProd._id,
          productName: newProd.name,
          productImage: imgUrl,
          availableStock: Number(newProd.stock ?? 0),
          originalQty: 0,
          categoryId: catId,
          categoryName: catName,
          quantity: 1,
          unitPrice,
          salePrice: unitPrice,
          description: "",
        },
      ];
    });
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length <= 1) {
      toast.error("An invoice must have at least one product item.");
      return;
    }
    setProducts((prev) => prev.filter((_, i) => i !== index));
    if (swappingIndex === index) setSwappingIndex(null);
  };

  const calculatedTotal = products.reduce((acc, p) => acc + (Number(p.salePrice) || 0), 0);
  const totalUnits = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (!customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (products.length === 0) {
      toast.error("Please add at least one product.");
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
          categoryId: p.categoryId || undefined,
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

  const isSellInvoice = (invoice?.type || "Sell") === "Sell";

  return (
    <LightModalShell
      isOpen={isOpen && !!invoice}
      onClose={onClose}
      icon={<ReceiptText size={20} />}
      title={invoice ? `Edit Invoice #${invoice._id.slice(-6).toUpperCase()}` : "Edit Invoice"}
      subtitle={
        invoice ? (
          <span>
            Type:{" "}
            <strong className={isSellInvoice ? "text-emerald-600" : "text-amber-600"}>
              {invoice.type || "Sell"}
            </strong>{" "}
            • Created: {new Date(invoice.createdAt).toLocaleDateString()}
          </span>
        ) : undefined
      }
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {/* Customer Details Section */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User size={13} className="text-emerald-600" /> Customer Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-foreground">Customer Name *</label>
                <div className="relative mt-1">
                  <User size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    placeholder="Full name"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground">Phone Number</label>
                <div className="relative mt-1">
                  <Phone size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground">Email Address</label>
                <div className="relative mt-1">
                  <Mail size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground">City</label>
                <div className="relative mt-1">
                  <Building2 size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    placeholder="e.g. Lahore, Karachi"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-foreground">Delivery Address</label>
                <div className="relative mt-1">
                  <MapPin size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    placeholder="Full street address"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-foreground">Customer Note</label>
                <div className="relative mt-1">
                  <StickyNote size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    placeholder="Special instructions or notes"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package size={13} className="text-emerald-600" /> Products & Quantities ({products.length} items • {totalUnits} units)
              </h4>
              <button
                type="button"
                onClick={() => setShowAddPicker((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold active:scale-[0.98] transition-all cursor-pointer shadow-2xs shrink-0 ${
                  showAddPicker
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-emerald-600/25 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-600/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                }`}
              >
                <Plus size={14} />
                {showAddPicker ? "Hide Picker" : "Add Product"}
              </button>
            </div>

            <AnimatePresence>
              {showAddPicker && (
                <div className="w-full">
                  <EditModalProductPicker
                    autoOpen
                    onSelect={handleAddProduct}
                    onCancel={() => setShowAddPicker(false)}
                    requireStock={isSellInvoice}
                    excludeIds={products.map((p) => p.productId)}
                  />
                </div>
              )}
            </AnimatePresence>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-amber-800 text-xs dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-300">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <p>
                <strong>Automatic Stock Reconciliation:</strong> Replacing, removing, or changing
                quantities on Sell invoices automatically restores old product stock and adjusts new
                warehouse stock with audit logs.
              </p>
            </div>

            <AnimatePresence initial={false}>
              <div className="space-y-2.5">
                {products.map((item, idx) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    key={item.rowKey}
                    className="bg-muted/35 border border-border rounded-2xl p-3.5 space-y-3 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-10 h-10 rounded-xl object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                            <Package size={16} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-foreground truncate">{item.productName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {item.categoryName} • Warehouse Stock:{" "}
                            <strong className="text-foreground">{item.availableStock}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Row Actions: Swap Product & Remove */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSwappingIndex(swappingIndex === idx ? null : idx)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                            swappingIndex === idx
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }`}
                          title="Replace with another product"
                        >
                          <ArrowLeftRight size={12} />
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(idx)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 cursor-pointer dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Inline Swap Picker */}
                    <AnimatePresence>
                      {swappingIndex === idx && (
                        <EditModalProductPicker
                          autoOpen
                          compact
                          requireStock={isSellInvoice}
                          placeholder={`Replace "${item.productName}" with...`}
                          onSelect={(newProd) => handleSwapProduct(idx, newProd)}
                          onCancel={() => setSwappingIndex(null)}
                        />
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground">Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-bold text-foreground mt-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground">Line Total (PKR) *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={item.salePrice}
                          onChange={(e) => handleSalePriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-emerald-700 font-black mt-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 dark:text-emerald-400"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-muted-foreground">Unit Rate</label>
                        <div className="text-xs font-mono font-bold py-2 px-2.5 rounded-xl bg-background border border-border/70 text-foreground mt-0.5">
                          Rs. {(item.unitPrice || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-3">
                        <label className="text-[10px] font-bold text-muted-foreground">Description / Serial</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                          placeholder="Item notes, serial number, condition"
                          className="w-full bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground mt-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>
        </div>

        {/* Sticky Footer & Totals */}
        <div className="px-5 sm:px-6 py-4 border-t border-border bg-muted/25 space-y-3 shrink-0">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between dark:bg-emerald-500/10 dark:border-emerald-500/25">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Updated Grand Total ({totalUnits} units):
            </span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
              PKR {calculatedTotal.toLocaleString()}
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
              className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </LightModalShell>
  );
};
