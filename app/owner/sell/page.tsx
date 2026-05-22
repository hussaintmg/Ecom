"use client";
import React, { useEffect, useState } from "react";
import { ProductProvider, useProducts } from "@/context/ProductContext";
import { InvoiceProvider, useInvoices } from "@/context/InvoiceContext";
import Button from "@/components/ui/Button";
import BillModal from "@/components/BillModal";
import { RefreshCw, ShoppingCart, Search, Package } from "lucide-react";

const SellInner = () => {
  const { products, loading: productsLoading, fetchProducts } = useProducts();
  const { createInvoice } = useInvoices();

  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [description, setDescription] = useState("");
  const [selling, setSelling] = useState(false);

  // Bill modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [lastBillData, setLastBillData] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const selectedProduct = products.find((p) => p._id === selectedProductId);
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = Number(quantity);
    const price = Number(salePrice);

    if (qty <= 0) {
      alert("Quantity must be greater than zero");
      return;
    }
    if (qty > selectedProduct.stock) {
      alert(`Cannot sell more than available stock (${selectedProduct.stock})`);
      return;
    }
    if (price <= 0) {
      alert("Sale price must be greater than zero");
      return;
    }
    if (!description.trim()) {
      alert("Description is required");
      return;
    }

    setSelling(true);
    const ok = await createInvoice({
      productId: selectedProduct._id,
      quantity: qty,
      salePrice: price,
      description,
    });

    if (ok) {
      // Prepare bill data
      const invoiceNo = `INV-${Date.now()}`;
      const date = new Date().toLocaleString();
      setLastBillData({
        invoiceNo,
        date,
        productName: selectedProduct.name,
        quantity: qty,
        totalPrice: price,
        description,
      });
      setShowBillModal(true);

      // Reset form
      setQuantity("");
      setSalePrice("");
      setDescription("");
      setSelectedProductId("");
      await fetchProducts(); // Refresh stock
    }
    setSelling(false);
  };

  const inputClass =
    "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="flex flex-col gap-8">
      {/* Header unchanged */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <ShoppingCart size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Manual Sell Point</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select a product and create a sales invoice
          </p>
        </div>
      </div>

      {/* Grid layout unchanged */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Product selection (unchanged) */}
        <div className="flex flex-col gap-4">
          <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm">
            <h2 className="font-bold text-base">Select Product</h2>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                className={`${inputClass} pl-10`}
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
              {productsLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-16 bg-muted/60 rounded-xl" />
                  <div className="h-16 bg-muted/60 rounded-xl" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No products found.
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => setSelectedProductId(p._id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedProductId === p._id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <Package size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">{p.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className={p.stock > 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                          {p.stock} in stock
                        </span>
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Sell form (unchanged except we removed auto-price calculation) */}
        <div>
          <form
            onSubmit={handleSell}
            className={`border rounded-2xl bg-card p-6 flex flex-col gap-5 shadow-sm transition-opacity ${
              !selectedProduct ? "opacity-50 pointer-events-none grayscale" : ""
            }`}
          >
            <h2 className="font-bold text-base flex justify-between items-center">
              <span>Checkout Details</span>
              {selectedProduct && (
                <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                  Stock: {selectedProduct.stock}
                </span>
              )}
            </h2>

            {selectedProduct && (
              <div className="mb-2">
                <p className="text-sm font-semibold">{selectedProduct.name}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantity Sold *
                </span>
                <input
                  type="number"
                  className={inputClass}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  min={1}
                  placeholder="e.g. 2"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Sale Price (PKR) *
                </span>
                <input
                  type="number"
                  className={inputClass}
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  required
                  min={1}
                  placeholder="e.g. 2500"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description / Memo *
              </span>
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Walk-in customer sale..."
              />
            </label>

            <Button
              type="submit"
              disabled={selling || !selectedProduct}
              className="w-full gap-2 mt-2"
            >
              {selling ? <RefreshCw size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
              Confirm Sale & Generate Invoice
            </Button>
          </form>
        </div>
      </div>

      {/* Bill Modal */}
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

const OwnerSellPage = () => {
  return (
    <ProductProvider>
      <InvoiceProvider>
        <SellInner />
      </InvoiceProvider>
    </ProductProvider>
  );
};

export default OwnerSellPage;