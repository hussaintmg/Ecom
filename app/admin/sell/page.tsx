"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useProducts } from "@/context/ProductContext";
import { useInvoices } from "@/context/InvoiceContext";
import Button from "@/components/ui/Button";
import BillModal from "@/components/BillModal";
import { RefreshCw, ShoppingCart, Search, Package, ChevronLeft, ChevronRight } from "lucide-react";

const SellInner = () => {
  const { 
    products, 
    totalProducts,
    currentPage,
    totalPages,
    loading: productsLoading, 
    fetchProducts,
    setCurrentPage,
    searchQuery,
    setSearchQuery
  } = useProducts();
  const { createInvoice } = useInvoices();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [description, setDescription] = useState("");
  const [selling, setSelling] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [localSearch, setLocalSearch] = useState(searchQuery || "");

  // Bill modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [lastBillData, setLastBillData] = useState<any>(null);

  // Fetch products when dependencies change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
      fetchProducts(currentPage, localSearch);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPage, localSearch, searchQuery, setSearchQuery, fetchProducts]);

  // Initial fetch
  useEffect(() => {
    fetchProducts(1, "", "All");
  }, [fetchProducts]);

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setCurrentPage(1);
    setSelectedProductId(""); // Clear selected product when searching
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    // Reset form fields when new product is selected
    setQuantity("");
    setSalePrice("");
    setDescription("");
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setSelectedProductId(""); // Clear selection when changing page
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setSelectedProductId(""); // Clear selection when changing page
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
      setSelectedProductId(""); // Clear selection when changing page
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const page = parseInt(pageInput);
      if (!isNaN(page)) {
        goToPage(page);
      }
    }
  };

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
      await fetchProducts(currentPage, localSearch); // Refresh stock
    }
    setSelling(false);
  };

  const inputClass =
    "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  // Calculate range
  const startProduct = (currentPage - 1) * 10 + 1;
  const endProduct = Math.min(currentPage * 10, totalProducts);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
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

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Product selection with pagination */}
        <div className="flex flex-col gap-4">
          <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Select Product</h2>
              {totalProducts > 0 && (
                <p className="text-xs text-muted-foreground">
                  Showing {startProduct}-{endProduct} of {totalProducts}
                </p>
              )}
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                className={`${inputClass} pl-10`}
                placeholder="Search products..."
                value={localSearch}
                onChange={handleSearchChange}
              />
            </div>
            
            {/* Products List */}
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
              {productsLoading && products.length === 0 ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-16 bg-muted/60 rounded-xl" />
                  <div className="h-16 bg-muted/60 rounded-xl" />
                  <div className="h-16 bg-muted/60 rounded-xl" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No products found.
                </div>
              ) : (
                <>
                  {products.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => handleProductSelect(p._id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedProductId === p._id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Product Image */}
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {p.images?.[0]?.url ? (
                          <img 
                            src={p.images[0].url} 
                            alt={p.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package size={20} className="text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">{p.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground truncate">
                            Stock: 
                            <span className={p.stock > 0 ? "text-emerald-600 font-bold ml-1" : "text-red-500 font-bold ml-1"}>
                              {p.stock}
                            </span>
                          </p>
                          {p.category && typeof p.category === "object" && (
                            <p className="text-xs text-muted-foreground truncate">
                              • {p.category.name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Selection Indicator */}
                      {selectedProductId === p._id && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1 || productsLoading}
                    className="gap-1 h-8 px-2"
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={handlePageInputKeyDown}
                      className="w-12 px-1 py-1 text-xs text-center border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
                      min={1}
                      max={totalPages}
                      placeholder={currentPage.toString()}
                      disabled={productsLoading}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => goToPage(parseInt(pageInput))}
                      disabled={!pageInput || productsLoading}
                      className="h-8 px-2 text-xs"
                    >
                      Go
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages || productsLoading}
                    className="gap-1 h-8 px-2"
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sell form */}
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
              <div className="mb-2 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-semibold">{selectedProduct.name}</p>
                {selectedProduct.category && typeof selectedProduct.category === "object" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Category: {selectedProduct.category.name}
                  </p>
                )}
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
                  max={selectedProduct?.stock || 999}
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

const AdminSellPage = () => {
  return <SellInner />;
};

export default AdminSellPage;