"use client";
import React, { useEffect, useState } from "react";
import { useProducts } from "@/context/ProductContext";
import { useInvoices } from "@/context/InvoiceContext";
import Button from "@/components/ui/Button";
import BillModal from "@/components/BillModal";
import { RefreshCw, ShoppingCart, Search, Package, ChevronLeft, ChevronRight, Plus, Trash2, Edit2, CheckCircle2, X } from "lucide-react";

const STOCK_FILTERS = [
  { label: "All", value: "All" },
  { label: "In Stock", value: "InStock" },
  { label: "Out of Stock", value: "OutOfStock" },
];

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
    setSearchQuery,
    stockFilter,
    setStockFilter,
  } = useProducts();
  const { createInvoice } = useInvoices();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [description, setDescription] = useState("");
  const [selling, setSelling] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [localSearch, setLocalSearch] = useState(searchQuery || "");
  const [prevSearch, setPrevSearch] = useState(searchQuery || "");

  // Multi-product states
  const [appendedProducts, setAppendedProducts] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Bill modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [lastBillData, setLastBillData] = useState<any>(null);

  // Fetch products when search changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== prevSearch) {
        setPrevSearch(localSearch);
        fetchProducts(1, localSearch, "All", stockFilter);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [localSearch, fetchProducts, stockFilter]);

  // Handle page changes
  useEffect(() => {
    fetchProducts(currentPage, prevSearch, "All", stockFilter);
  }, [currentPage, fetchProducts]);

  // Re-fetch when stock filter changes
  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1, localSearch, "All", stockFilter);
  }, [stockFilter, fetchProducts]);

  // Initial fetch
  useEffect(() => {
    fetchProducts(1, "", "All", "All");
  }, [fetchProducts]);

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setCurrentPage(1);
    setSelectedProductId(""); // Clear selected product when searching
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setEditingIndex(null); // Clear edit mode when selecting a new product
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

  // Append or Update item in local list
  const handleAppendItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = Number(quantity);
    const price = Number(salePrice);

    if (qty <= 0) {
      alert("Quantity must be greater than zero");
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

    // Accumulative stock check: sum of this product's quantities in other cart entries
    const existingQtyInCart = appendedProducts.reduce((sum, item, idx) => {
      if (editingIndex !== null && idx === editingIndex) return sum; // exclude current editing item
      return item.productId === selectedProduct._id ? sum + item.quantity : sum;
    }, 0);

    const totalNeeded = existingQtyInCart + qty;

    if (totalNeeded > selectedProduct.stock) {
      alert(`stock kam hai aur beche ziyada nahi sakte!\n\nAvailable Stock: ${selectedProduct.stock}\nAlready Appended: ${existingQtyInCart}\nAttempted to Add: ${qty}\nTotal required (${totalNeeded}) exceeds availability.`);
      return;
    }

    if (editingIndex !== null) {
      // Update existing item
      const updatedList = [...appendedProducts];
      updatedList[editingIndex] = {
        productId: selectedProduct._id,
        product: selectedProduct,
        quantity: qty,
        salePrice: price,
        description: description.trim(),
      };
      setAppendedProducts(updatedList);
      setEditingIndex(null);
      alert("Item updated successfully inside invoice list!");
    } else {
      // Append new item
      setAppendedProducts([
        ...appendedProducts,
        {
          productId: selectedProduct._id,
          product: selectedProduct,
          quantity: qty,
          salePrice: price,
          description: description.trim(),
        }
      ]);
    }

    // Clear form
    setQuantity("");
    setSalePrice("");
    setDescription("");
    setSelectedProductId("");
  };

  const handleEditItem = (index: number) => {
    const item = appendedProducts[index];
    setSelectedProductId(item.productId);
    setQuantity(item.quantity.toString());
    setSalePrice(item.salePrice.toString());
    setDescription(item.description);
    setEditingIndex(index);
  };

  const handleDeleteItem = (index: number) => {
    if (confirm("Are you sure you want to remove this item from the invoice list?")) {
      const newList = appendedProducts.filter((_, idx) => idx !== index);
      setAppendedProducts(newList);
      if (editingIndex === index) {
        setEditingIndex(null);
        setQuantity("");
        setSalePrice("");
        setDescription("");
        setSelectedProductId("");
      } else if (editingIndex !== null && editingIndex > index) {
        setEditingIndex(editingIndex - 1);
      }
    }
  };

  const handleCheckout = async () => {
    if (appendedProducts.length === 0) return;

    setSelling(true);

    const payload = {
      products: appendedProducts.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
        salePrice: p.salePrice,
        description: p.description,
      }))
    };

    const ok = await createInvoice(payload);

    if (ok) {
      // Prepare multi-product bill data
      const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
      const date = new Date().toLocaleString("en-PK", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      setLastBillData({
        invoiceNo,
        date,
        products: appendedProducts.map(p => ({
          productName: p.product.name,
          quantity: p.quantity,
          salePrice: p.salePrice,
          description: p.description,
          productDescription: p.product.description || "",
          productImage: p.product.images?.[0]?.url || "",
        })),
        totalAmount: appendedProducts.reduce((acc, p) => acc + p.salePrice, 0),
      });

      setShowBillModal(true);

      // Reset everything
      setAppendedProducts([]);
      setEditingIndex(null);
      setQuantity("");
      setSalePrice("");
      setDescription("");
      setSelectedProductId("");
      await fetchProducts(currentPage, localSearch, "All", stockFilter); // Refresh stock
    }
    setSelling(false);
  };

  const inputClass =
    "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  // Calculate range
  const startProduct = (currentPage - 1) * 10 + 1;
  const endProduct = Math.min(currentPage * 10, totalProducts);

  const totalBillAmount = appendedProducts.reduce((acc, p) => acc + p.salePrice, 0);

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
            Append multiple products and create a combined sales invoice
          </p>
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Product selection with pagination (Col Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
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

            {/* Stock Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {STOCK_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setStockFilter(f.value);
                    setSelectedProductId("");
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                    stockFilter === f.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/40"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            
            {/* Products List */}
            <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-2">
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
                  {products.map((p) => {
                    const quantityInCart = appendedProducts.reduce((sum, item) => 
                      item.productId === p._id ? sum + item.quantity : sum, 0
                    );
                    const remainingStock = p.stock - quantityInCart;

                    return (
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
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground truncate">
                              Stock: 
                              <span className={p.stock > 0 ? "text-emerald-600 font-bold ml-1" : "text-red-500 font-bold ml-1"}>
                                {p.stock}
                              </span>
                            </p>
                            {quantityInCart > 0 && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                Added: {quantityInCart}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Selection Indicator */}
                        {selectedProductId === p._id && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
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

        {/* Right: Checkout detail form (Col Span 7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <form
            onSubmit={handleAppendItem}
            className={`border rounded-2xl bg-card p-6 flex flex-col gap-5 shadow-sm transition-all ${
              !selectedProduct ? "opacity-50 pointer-events-none grayscale max-h-[120px] overflow-hidden" : ""
            }`}
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-base flex items-center gap-2">
                <span>{editingIndex !== null ? "Edit Details" : "Product Details"}</span>
                {editingIndex !== null && (
                  <span className="text-xs bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded">
                    Editing Item #{editingIndex + 1}
                  </span>
                )}
              </h2>
              {selectedProduct && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                    Available Stock: {selectedProduct.stock}
                  </span>
                  {editingIndex !== null && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingIndex(null);
                        setQuantity("");
                        setSalePrice("");
                        setDescription("");
                        setSelectedProductId("");
                      }}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Cancel Edit"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="p-3 bg-muted/30 rounded-lg">
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
                placeholder="Walk-in customer sale details..."
              />
            </label>

            <Button
              type="submit"
              disabled={!selectedProduct}
              className="w-full gap-2 mt-2"
              variant={editingIndex !== null ? "outline" : "primary"}
            >
              {editingIndex !== null ? <Edit2 size={14} /> : <Plus size={14} />}
              {editingIndex !== null ? "Update Item in Invoice List" : "Append Product to Invoice"}
            </Button>
          </form>

          {/* Appended Products Table */}
          <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm">
            <h2 className="font-bold text-base flex justify-between items-center">
              <span>Appended Products ({appendedProducts.length})</span>
              {appendedProducts.length > 0 && (
                <span className="text-sm font-black text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl">
                  Total: Rs. {totalBillAmount.toLocaleString()}
                </span>
              )}
            </h2>

            {appendedProducts.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground gap-2 border border-dashed rounded-xl bg-muted/10">
                <ShoppingCart size={32} className="opacity-20" />
                <p className="text-xs">No products appended yet. Select products on the left and add details.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-center">#</th>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3">Memo</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {appendedProducts.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3.5 text-center font-bold text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                {item.product.images?.[0]?.url ? (
                                  <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={14} className="text-muted-foreground" />
                                )}
                              </div>
                              <span className="font-semibold truncate max-w-[120px]">{item.product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold">{item.quantity}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-600">Rs. {item.salePrice.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-muted-foreground truncate max-w-[100px]">{item.description}</td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditItem(idx)}
                                className="p-1 rounded hover:bg-amber-500/10 text-amber-500 transition-colors"
                                title="Edit Item"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(idx)}
                                className="p-1 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                                title="Delete Item"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={selling}
                  className="w-full gap-2 text-white font-black tracking-wide"
                  variant="primary"
                >
                  {selling ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {selling ? "Processing Sales..." : "Complete Checkout & Generate Bill"}
                </Button>
              </div>
            )}
          </div>
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