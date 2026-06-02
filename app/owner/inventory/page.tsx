"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useProducts } from "@/context/ProductContext";
import { Grid, RefreshCw, Package, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

const InventoryInner = () => {
  const { 
    products, 
    totalProducts,
    currentPage,
    totalPages,
    loading, 
    fetchProducts,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory
  } = useProducts();
  
  const [refreshing, setRefreshing] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [localSearch, setLocalSearch] = useState(searchQuery || "");
  const [localCategory, setLocalCategory] = useState(selectedCategory || "All");
  const [totalStock, setTotalStock] = useState(0);
  const [stockLoading, setStockLoading] = useState(false);

  // Fetch total stock
  const fetchTotalStock = useCallback(async (search: string, category: string) => {
    try {
      setStockLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category && category !== "All") params.append("category", category);
      
      const response = await fetch(`/api/products/stock-total?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTotalStock(data.totalStock);
      }
    } catch (error) {
      console.error("Error fetching total stock:", error);
    } finally {
      setStockLoading(false);
    }
  }, []);

  // Fetch products when dependencies change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
      if (localCategory !== selectedCategory) {
        setSelectedCategory(localCategory);
      }
      fetchProducts(currentPage, localSearch, localCategory);
      fetchTotalStock(localSearch, localCategory);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPage, localSearch, localCategory, fetchTotalStock, fetchProducts, setSearchQuery, setSelectedCategory]);

  // Initial fetch
  useEffect(() => {
    fetchProducts(1, "", "All");
    fetchTotalStock("", "All");
  }, [fetchProducts, fetchTotalStock]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(currentPage, localSearch, localCategory);
    setRefreshing(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
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

  // Calculate range
  const startProduct = (currentPage - 1) * 10 + 1;
  const endProduct = Math.min(currentPage * 10, totalProducts);

  // Get category name helper
  const getCategoryName = (product: any): string => {
    if (!product.category) return "None";
    if (typeof product.category === "object" && product.category.name) {
      return product.category.name;
    }
    return "None";
  };

  // Stock level indicator
  const getStockLevel = (stock: number) => {
    if (stock === 0) return { text: "Out of Stock", color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-950/20" };
    if (stock <= 5) return { text: "Low Stock", color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/20" };
    if (stock <= 10) return { text: "Medium Stock", color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/20" };
    return { text: "Good Stock", color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/20" };
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Grid size={20} />
            </div>
            <div>
              <div className="h-8 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Grid size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Stock Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalProducts > 0 
                ? `Showing ${startProduct}-${endProduct} of ${totalProducts} products` 
                : "No products found"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="gap-2"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh Status
        </Button>
      </div>

      {/* Content */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        {/* Search */}
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            placeholder="Search products..."
            value={localSearch}
            onChange={handleSearchChange}
          />
        </div>

        {totalProducts === 0 && !loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm border rounded-xl border-dashed">
            No products found matching your search.
          </div>
        ) : (
          <>
            {/* Products List */}
            <div className="flex flex-col gap-3">
              {products.map((p) => {
                const stockLevel = getStockLevel(p.stock);
                return (
                  <div
                    key={p._id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Product Image */}
                      {p.images?.[0]?.url ? (
                        <img 
                          src={p.images[0].url} 
                          alt={p.name} 
                          className="w-12 h-12 rounded-lg object-cover border" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package size={20} className="text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            Category: {getCategoryName(p)}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${stockLevel.bgColor} ${stockLevel.color}`}>
                            {stockLevel.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Count */}
                    <div className="flex flex-col items-end gap-1 min-w-[80px]">
                      <span className={`text-lg font-black ${stockLevel.color}`}>
                        {p.stock}
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Units Left
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Go to page</span>
                    <input
                      type="number"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={handlePageInputKeyDown}
                      className="w-16 px-2 py-1 text-sm text-center border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
                      min={1}
                      max={totalPages}
                      placeholder={currentPage.toString()}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => goToPage(parseInt(pageInput))}
                      disabled={!pageInput}
                    >
                      Go
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Total Stock Summary */}
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 p-6 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    Total Filtered Stock
                  </p>
                  {stockLoading ? (
                    <div className="h-10 mt-2 bg-emerald-200 dark:bg-emerald-800 rounded animate-pulse" />
                  ) : (
                    <p className="text-4xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
                      {totalStock.toLocaleString()}
                    </p>
                  )}
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-2">
                    {localSearch ? `From search: "${localSearch}"` : localCategory !== "All" ? `Category: ${localCategory}` : "All products"}
                  </p>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 p-6 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-400">
                    Matching Products
                  </p>
                  {stockLoading ? (
                    <div className="h-10 mt-2 bg-blue-200 dark:bg-blue-800 rounded animate-pulse" />
                  ) : (
                    <p className="text-4xl font-black text-blue-700 dark:text-blue-400 mt-2">
                      {totalProducts}
                    </p>
                  )}
                  <p className="text-[10px] text-blue-600 dark:text-blue-500 mt-2">
                    Products found
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const OwnerInventoryPage = () => {
  return <InventoryInner />;
};

export default OwnerInventoryPage;