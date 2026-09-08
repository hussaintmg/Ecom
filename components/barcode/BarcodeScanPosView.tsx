"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ScanBarcode,
  ShoppingCart,
  CreditCard,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  ReceiptText,
  User,
  Phone,
  MapPin,
  RefreshCw,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import BarcodeScannerView from "@/components/barcode/BarcodeScannerView";
import Button from "@/components/ui/Button";

interface CartItem {
  product: any;
  productId: string;
  name: string;
  barcode: string;
  unitPrice: number;
  quantity: number;
  salePrice: number;
  stock: number;
  images?: any[];
}

interface BarcodeScanPosViewProps {
  role: "owner" | "admin";
}

const BarcodeScanPosView: React.FC<BarcodeScanPosViewProps> = ({ role }) => {
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_BARCODE === "true";

  const [mode, setMode] = useState<"cash" | "credit">("cash");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Customer state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    type: "cash" | "credit";
    id: string;
    total: number;
    customerName: string;
    itemsCount: number;
  } | null>(null);

  // If feature flag is false, show disabled page
  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Barcode Feature Disabled</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          The barcode scanning and generation system is currently disabled via environment configuration (<code>NEXT_PUBLIC_ENABLE_BARCODE=false</code>).
        </p>
        <Link href={`/${role}/dashboard`} className="mt-6">
          <Button variant="outline" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Handle scanned barcode lookup
  const handleBarcodeScanned = async (code: string) => {
    setLookingUp(true);
    setLookupMessage(null);

    try {
      const res = await fetch(`/api/products/barcode-lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.product) {
        setLookupMessage({
          text: `Barcode "${code}" not found.`,
          type: "error",
        });
        setTimeout(() => setLookupMessage(null), 3500);
        return;
      }

      const prod = data.product;
      const effectivePrice = Number(prod.price) || 0;

      // Check if product is already in cart
      setCartItems((prev) => {
        const existingIdx = prev.findIndex((item) => item.productId === prod._id);
        if (existingIdx > -1) {
          const updated = [...prev];
          const current = updated[existingIdx];
          const newQty = current.quantity + 1;
          updated[existingIdx] = {
            ...current,
            quantity: newQty,
            salePrice: current.unitPrice * newQty,
          };
          return updated;
        } else {
          return [
            {
              product: prod,
              productId: prod._id,
              name: prod.name,
              barcode: prod.barcode || prod._id,
              unitPrice: effectivePrice,
              quantity: 1,
              salePrice: effectivePrice,
              stock: prod.stock || 0,
              images: prod.images || [],
            },
            ...prev,
          ];
        }
      });

      setLookupMessage({
        text: `Scanned: "${prod.name}" (Rs. ${effectivePrice.toLocaleString()})`,
        type: "success",
      });
      setTimeout(() => setLookupMessage(null), 3500);
    } catch (err: any) {
      setLookupMessage({
        text: err.message || "Error during barcode lookup",
        type: "error",
      });
      setTimeout(() => setLookupMessage(null), 3500);
    } finally {
      setLookingUp(false);
    }
  };

  // Quantity and price modifiers
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: newQty,
            salePrice: item.unitPrice * newQty,
          };
        }
        return item;
      })
    );
  };

  const updateUnitPrice = (productId: string, newPrice: number) => {
    const validPrice = Math.max(0, newPrice);
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            unitPrice: validPrice,
            salePrice: validPrice * item.quantity,
          };
        }
        return item;
      })
    );
  };

  const removeItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setLookupMessage(null);
  };

  const totalBill = cartItems.reduce((sum, item) => sum + item.salePrice, 0);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Quick Walk-in customer filler
  const setWalkInCustomer = () => {
    setCustomerName("Walk-in Customer");
    setCustomerPhone("0000-0000000");
    setCustomerCity("Local");
  };

  // Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      alert("Please scan or add at least one product.");
      return;
    }

    if (!customerName.trim()) {
      alert("Please enter customer name.");
      return;
    }

    setSubmitting(true);

    try {
      const payloadProducts = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        description: `Barcode sold: ${item.barcode}`,
      }));

      const payload = {
        products: payloadProducts,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerCity: customerCity.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
      };

      const endpoint = mode === "cash" ? "/api/invoices" : "/api/credit-sales";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || (!data.success && !data._id && !data.invoice)) {
        throw new Error(data.error || data.message || "Failed to process transaction");
      }

      const recordId = data.invoice?._id || data._id || data.creditSale?._id || "OK";

      setSuccessResult({
        type: mode,
        id: recordId,
        total: totalBill,
        customerName: customerName.trim(),
        itemsCount: totalItemsCount,
      });

      // Clear cart and customer info on success
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerCity("");
      setCustomerNote("");
    } catch (err: any) {
      alert(err.message || "Checkout transaction failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
            <ScanBarcode size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Barcode Scanner POS</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Scan product barcodes to quickly ring up cash sales or record credit sales
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-muted/60 p-1.5 rounded-2xl border">
          <button
            type="button"
            onClick={() => setMode("cash")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === "cash"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart size={15} /> Cash Sale (Invoice)
          </button>
          <button
            type="button"
            onClick={() => setMode("credit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === "credit"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard size={15} /> Credit Sale (Khata)
          </button>
        </div>
      </div>

      {/* Main Grid: Left Scanner / Right Invoice List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Viewfinder & Feedback */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <BarcodeScannerView onScan={handleBarcodeScanned} disabled={submitting} />

          {/* Lookup Feedback Toast */}
          {lookupMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 border ${
                lookupMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                  : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40"
              }`}
            >
              {lookupMessage.type === "success" ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle size={16} className="shrink-0 text-red-500" />
              )}
              <span>{lookupMessage.text}</span>
            </div>
          )}

          {/* POS Quick Shortcuts Card */}
          <div className="p-4 rounded-2xl border bg-card/60 backdrop-blur-sm text-xs text-muted-foreground flex flex-col gap-2">
            <span className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Sparkles size={13} className="text-primary" /> Scanner Tips
            </span>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Use back camera in good lighting for fastest detection.</li>
              <li>Scanning the same barcode multiple times automatically increments quantity.</li>
              <li>You can also plug in any standard USB handheld barcode scanner.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Transaction Cart & Customer Form */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-5">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    mode === "cash" ? "bg-emerald-500" : "bg-primary"
                  }`}
                />
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {mode === "cash" ? "Cash Sale Invoice" : "Credit Sale Register"}
                </h3>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-bold">
                  {cartItems.length} items ({totalItemsCount} total qty)
                </span>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-destructive hover:underline font-semibold flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear All
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center border rounded-xl border-dashed bg-muted/10 text-muted-foreground gap-2">
                <ScanBarcode size={36} className="opacity-30" />
                <p className="font-bold text-sm text-foreground">No Products Scanned Yet</p>
                <p className="text-xs max-w-xs">
                  Scan any product barcode with your camera or enter barcode manually on the left.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {cartItems.map((item) => {
                  const isOverStock = item.quantity > item.stock;

                  return (
                    <div
                      key={item.productId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-background/60 hover:bg-muted/20 transition-all gap-3"
                    >
                      {/* Product Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.images?.[0]?.url ? (
                          <img
                            src={item.images[0].url}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover border shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <ScanBarcode size={18} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm truncate">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                              {item.barcode}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                item.stock > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-500"
                              }`}
                            >
                              Stock: {item.stock}
                            </span>
                            {isOverStock && (
                              <span className="text-[10px] text-red-500 font-bold animate-pulse">
                                (Exceeds stock!)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Controls: Price & Quantity */}
                      <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                        {/* Unit Price input */}
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                            Unit Price (PKR)
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateUnitPrice(item.productId, Number(e.target.value))
                            }
                            className="w-20 text-right px-2 py-1 text-xs font-bold rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.productId, parseInt(e.target.value) || 1)
                            }
                            className="w-10 text-center text-xs font-black bg-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[75px]">
                          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                            Total
                          </span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            Rs. {item.salePrice.toLocaleString()}
                          </span>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Customer Details & Checkout Form */}
            <form onSubmit={handleCheckout} className="flex flex-col gap-4 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User size={13} /> Customer Details
                </span>
                <button
                  type="button"
                  onClick={setWalkInCustomer}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Quick Fill Walk-in
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="Customer Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-background outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-background outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="City / Address"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-background outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Notes / Remarks (Optional)"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-background outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Total Summary & Checkout Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border mt-2">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold block">Grand Total</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    Rs. {totalBill.toLocaleString()}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || cartItems.length === 0}
                  className={`w-full sm:w-auto px-8 py-3 text-sm font-bold shadow-lg gap-2 ${
                    mode === "cash"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                      : "shadow-primary/30"
                  }`}
                >
                  {submitting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : mode === "cash" ? (
                    <ReceiptText size={16} />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  {submitting
                    ? "Processing..."
                    : mode === "cash"
                    ? `Complete Cash Sale (Rs. ${totalBill.toLocaleString()})`
                    : `Record Credit Sale (Rs. ${totalBill.toLocaleString()})`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-xl font-black tracking-tight">
              {successResult.type === "cash" ? "Invoice Created Successfully!" : "Credit Sale Recorded!"}
            </h3>

            <p className="text-xs text-muted-foreground mt-1">
              Transaction ID: <span className="font-mono font-bold text-foreground">{successResult.id}</span>
            </p>

            <div className="w-full bg-muted/40 rounded-xl p-3.5 my-5 text-left text-xs flex flex-col gap-2 border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-bold">{successResult.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Sold:</span>
                <span className="font-bold">{successResult.itemsCount} products</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground font-bold">Total Amount:</span>
                <span className="font-black text-emerald-600 text-sm">
                  Rs. {successResult.total.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs font-bold"
                onClick={() => setSuccessResult(null)}
              >
                Scan Next Sale
              </Button>

              <Link
                href={
                  successResult.type === "cash"
                    ? `/${role}/invoices`
                    : `/${role}/credit-sales`
                }
                className="flex-1"
              >
                <Button size="sm" className="w-full text-xs font-bold gap-1">
                  View Records <ArrowRight size={13} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanPosView;
